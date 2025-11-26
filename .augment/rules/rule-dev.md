---
type: "always_apply"
description: "criticalrules"
---

When developing, check the roadmap and follow it strictly. The correct sequence of developing should be:
1.Develop the features locally first. 2.test the local features with scripts and playwright mcp. 3.commit and push to github. 4. The push to github should trigger vercel's deployment automatically, check vercel through mcp or cli to make sure it did. If failed, trigger it again via mcp or cli. And then, access to the website deployed and test via playwright mcp. Test every feature thoroughly, analyze security issues and document the findings. 5. If any issue found, create github issues or simply document it, and then diagnose the issue, fix it until the remote website works without a problem. 6. document the final result. 6.Delete test files, make sure the strucure is clean.
During the development, you should be skeptical and careful, implement features one step at a time. You have the access to vercel, supabase and playwright mcps. The security of the project is of top priority, diagnose security issue and fix them if found.