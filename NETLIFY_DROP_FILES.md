# Files to Upload to Netlify Drop

## Method 1: Upload Entire Project Folder
Simply drag and drop the entire `/workspaces/backend` folder to Netlify Drop.

## Method 2: Essential Files Only

### Root Files (Required)
```
netlify.toml
package.json
package-lock.json
.env.example
DEPLOYMENT.md
```

### Frontend Folder (Complete - Required)
```
frontend/
├── package.json
├── package-lock.json  
├── public/
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   ├── robots.txt
│   ├── admin/
│   │   ├── index.html
│   │   └── config.yml
│   └── _redirects
├── src/
│   └── (all React components and files)
└── .gitignore
```

### Backend API (Required)
```
netlify/
└── functions/
    └── server.js

routes/
├── users.js
├── videos.js
└── (all other route files)

models/
├── User.js  
├── Video.js
└── (all other model files)

middleware/
└── (all middleware files)

services/
└── (all service files)
```

### Core Backend Files (Required)
```
server.js
admin.js
users.js
videos.js
analytics.js
ads.js
upload.js
```

### Content Management (Required)
```
content/
├── users/
│   ├── admin-user.md
│   └── demo-user.md
├── videos/
├── analytics/
├── settings/
└── ads/
```

## Files to EXCLUDE (Don't Upload)
- `node_modules/` (will be installed during build)
- `.git/` (version control, not needed)
- `.env` (contains secrets, use .env.example instead)
- `*.log` files
- `.DS_Store` (Mac system files)

## Recommended: Upload Everything
**Easiest approach:** Just drag the entire project folder to Netlify Drop. Netlify will automatically ignore unnecessary files like `node_modules/` and `.git/`.

## After Upload
1. Netlify will automatically detect it's a Node.js project
2. Set build command: `npm run build` 
3. Set publish directory: `frontend/build`
4. Configure environment variables in Netlify dashboard
5. Enable Netlify Identity for admin access