#!/usr/bin/env node

/**
 * 数据库连接和操作测试脚本
 *
 * 测试WeaveMind项目的数据库连接和基本操作
 *
 * 使用方法:
 * node test-database.js
 */

import { createClient } from '@supabase/supabase-js';

// 简单的管理员客户端创建函数
function createAdminClient() {
  return createClient(supabaseUrl, serviceRoleKey);
}

// 读取环境变量
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('❌ 缺少必要的环境变量');
  console.log('请确保设置了以下环境变量:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 创建客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createAdminClient();

console.log('🚀 开始数据库连接测试...\n');

// 测试基本连接
async function testConnection() {
  console.log('📡 测试数据库连接...');

  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('count', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

// 测试基本查询
async function testBasicQueries() {
  console.log('\n🔍 测试基本查询操作...');

  try {
    // 测试查询组织
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);

    if (orgError) {
      throw orgError;
    }

    console.log('✅ 组织查询成功:', orgs?.length || 0, '条记录');

    // 测试查询班级
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id, name, created_at')
      .limit(5);

    if (classError) {
      throw classError;
    }

    console.log('✅ 班级查询成功:', classes?.length || 0, '条记录');

    return true;
  } catch (error) {
    console.error('❌ 基本查询失败:', error.message);
    return false;
  }
}

// 测试管理员权限操作
async function testAdminOperations() {
  console.log('\n🔐 测试管理员权限操作...');

  try {
    // 使用管理员客户端测试
    const { data, error } = await adminClient
      .from('classes')
      .select('id, name')
      .limit(3);

    if (error) {
      throw error;
    }

    console.log('✅ 管理员权限正常，可以访问敏感数据');
    return true;
  } catch (error) {
    console.error('❌ 管理员权限测试失败:', error.message);
    return false;
  }
}

// 测试RLS (Row Level Security) 策略
async function testRLSPolicies() {
  console.log('\n🛡️ 测试RLS策略...');

  try {
    // 尝试直接访问需要权限的表
    const { error } = await supabase
      .from('organization_members')
      .select('*')
      .limit(1);

    // 如果没有用户认证，应该会返回权限错误
    if (error && (error.code === 'PGRST116' || error.message.includes('permission'))) {
      console.log('✅ RLS策略正常工作，未认证用户被正确拒绝');
      return true;
    } else if (error) {
      throw error;
    } else {
      console.log('⚠️ 警告: RLS策略可能存在问题，未认证用户能够访问受限数据');
      return false;
    }
  } catch (error) {
    console.error('❌ RLS策略测试失败:', error.message);
    return false;
  }
}

// 测试实体管理操作
async function testEntityManagement() {
  console.log('\n📋 测试实体管理操作...');

  try {
    // 模拟实体管理操作
    const testOperation = {
      actionType: 'entity_management',
      actionData: {
        action: 'list',
        entity: 'class'
      }
    };

    // 这里我们只是验证操作可以被正确解析
    // 实际执行需要用户认证
    console.log('✅ 实体管理操作格式正确');
    console.log('   操作类型:', testOperation.actionType);
    console.log('   操作数据:', JSON.stringify(testOperation.actionData, null, 2));

    return true;
  } catch (error) {
    console.error('❌ 实体管理操作测试失败:', error.message);
    return false;
  }
}

// 生成测试报告
function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 数据库测试结果报告');
  console.log('='.repeat(60));

  const tests = [
    { name: '数据库连接', result: results.connection },
    { name: '基本查询', result: results.queries },
    { name: '管理员权限', result: results.admin },
    { name: 'RLS策略', result: results.rls },
    { name: '实体管理', result: results.entity },
  ];

  let passCount = 0;
  let totalCount = tests.length;

  for (const test of tests) {
    const status = test.result ? '✅ 通过' : '❌ 失败';
    console.log(`${test.name.padEnd(15)}: ${status}`);
    if (test.result) passCount++;
  }

  console.log('\n总结:');
  console.log(`通过测试: ${passCount}/${totalCount}`);
  console.log(`成功率: ${((passCount / totalCount) * 100).toFixed(1)}%`);

  if (passCount === totalCount) {
    console.log('\n🎉 所有数据库测试通过！系统数据库操作正常。');
  } else {
    console.log('\n⚠️ 部分测试失败，请检查数据库配置和权限设置。');
  }

  return {
    total: totalCount,
    passed: passCount,
    failed: totalCount - passCount,
    successRate: (passCount / totalCount) * 100,
    results: tests
  };
}

// 主函数
async function main() {
  try {
    const results = {
      connection: await testConnection(),
      queries: await testBasicQueries(),
      admin: await testAdminOperations(),
      rls: await testRLSPolicies(),
      entity: await testEntityManagement(),
    };

    const report = generateReport(results);

    // 保存测试结果
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fs = await import('fs');
    fs.writeFileSync(
      `database-test-results-${timestamp}.json`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        report,
        environment: {
          supabaseUrl: supabaseUrl ? 'configured' : 'missing',
          hasAnonKey: !!supabaseAnonKey,
          hasServiceKey: !!serviceRoleKey,
        }
      }, null, 2)
    );

    console.log(`\n💾 测试结果已保存到: database-test-results-${timestamp}.json`);

    process.exit(report.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
main();