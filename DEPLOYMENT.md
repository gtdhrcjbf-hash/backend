# VideoMax Platform - Netlify Deployment Guide

## Overview
This guide covers deploying the VideoMax platform to Netlify with admin interface and user management.

## Files Created

### Admin Interface
- `frontend/public/admin/index.html` - Netlify CMS admin interface
- `frontend/public/admin/config.yml` - CMS configuration for content management
- `content/users/` - User management content structure
- `content/videos/` - Video content management
- `content/analytics/` - Analytics data management
- `content/settings/` - Platform settings
- `content/ads/` - Advertisement management

### Deployment Configuration
- `netlify.toml` - Main Netlify configuration
- `frontend/public/_redirects` - URL redirects for SPA routing
- `netlify/functions/server.js` - Serverless function for API
- `.env.example` - Environment variables template

## Deployment Steps

### 1. Prepare Repository
```bash
# Ensure all files are committed
git add .
git commit -m "Add Netlify admin configuration and deployment files"
git push origin main
```

### 2. Netlify Setup
1. Connect your GitHub repository to Netlify
2. Set build settings:
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
   - Base directory: `frontend`

### 3. Environment Variables
Configure these in Netlify dashboard under Site Settings > Environment Variables:

```
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
NODE_ENV=production
```

### 4. Enable Netlify Identity
1. Go to Site Settings > Identity
2. Enable Identity service
3. Set registration preferences (invite only recommended)
4. Configure external providers if needed

### 5. Enable Git Gateway
1. In Identity settings, enable Git Gateway
2. This allows CMS to commit changes to your repository

### 6. Create Admin User
1. Visit your deployed site at `/admin/`
2. Click "Login with Netlify Identity"
3. Create your admin account
4. You can now manage content through the CMS

## Admin Interface Features

### User Management
- View and manage all platform users
- Activate/deactivate user accounts
- Edit user profiles and roles

### Video Management
- Review and moderate video content
- Manage video metadata and categories
- Monitor video performance metrics

### Analytics Dashboard
- Track platform usage statistics
- Monitor user engagement metrics
- Generate performance reports

### Platform Settings
- Configure platform-wide settings
- Manage security and privacy options
- Control feature availability

### Advertisement Management
- Create and manage ad campaigns
- Track ad performance metrics
- Configure ad placement and targeting

## Security Features

- Helmet.js for security headers
- Rate limiting for API endpoints
- CORS configuration for cross-origin requests
- JWT authentication for API access
- Netlify Identity for admin authentication

## API Endpoints

All backend API endpoints are available at `/api/*`:
- `/api/users` - User management
- `/api/videos` - Video operations
- `/api/admin` - Admin functions
- `/api/analytics` - Analytics data
- `/api/ads` - Advertisement management

## Troubleshooting

### Build Issues
- Ensure all dependencies are installed
- Check Node.js version compatibility
- Verify environment variables are set

### Admin Access Issues
- Confirm Netlify Identity is enabled
- Check Git Gateway configuration
- Verify admin user permissions

### API Connection Issues
- Validate MongoDB connection string
- Check serverless function deployment
- Verify CORS configuration

## Support

For deployment issues or questions, refer to:
- Netlify documentation
- MongoDB Atlas documentation
- Cloudinary documentation