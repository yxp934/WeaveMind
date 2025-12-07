'use client';

import { useEffect, useState } from 'react'
import { createClient } from "@/lib/supabase/client"

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.error('Auth error:', error);
          setError(error.message);
          return;
        }

        console.log('User:', user);
        setUser(user);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <a href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded">前往登录</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Red Banner - Very Visible */}
      <div className="bg-red-600 text-white py-4 px-8 text-center font-bold text-2xl">
        ✅ TEACHER DASHBOARD IS WORKING! User: {user?.email || 'Unknown'}
      </div>

      {/* Simple Sidebar */}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: '250px',
        height: '100vh',
        backgroundColor: 'white',
        borderRight: '1px solid #e5e7eb',
        padding: '20px'
      }}>
        <h2 className="text-xl font-bold text-indigo-600 mb-4">WeaveMind</h2>
        <nav>
          <a href="/teacher" className="block py-2 text-indigo-600 font-medium">Dashboard</a>
          <a href="/teacher/organizations" className="block py-2 text-gray-700">Organizations</a>
          <a href="/teacher/classes" className="block py-2 text-gray-700">Classes</a>
          <a href="/teacher/courses" className="block py-2 text-gray-700">Courses</a>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ marginLeft: '250px', padding: '20px' }}>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          欢迎回来，{user?.user_metadata?.full_name || '教师'}！
        </h1>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 className="text-sm font-medium text-gray-600">组织机构</h3>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 className="text-sm font-medium text-gray-600">班级</h3>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 className="text-sm font-medium text-gray-600">课程</h3>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 className="text-sm font-medium text-gray-600">学生</h3>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">快速开始</h3>
            <p className="text-gray-600 mb-4">创建新组织或班级，开始您的教学之旅。</p>
            <a href="/teacher/organizations/new" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              创建组织
            </a>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI 助手</h3>
            <p className="text-gray-600 mb-4">使用 AI 快速生成课程内容和教学材料。</p>
            <a href="/teacher/courses/new-ai" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              生成课程
            </a>
          </div>
        </div>

        {/* Debug Info */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: '8px'
        }}>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">调试信息</h3>
          <p className="text-blue-800">用户已登录: {user?.email}</p>
          <p className="text-blue-800">用户ID: {user?.id}</p>
          <p className="text-blue-800">时间: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
