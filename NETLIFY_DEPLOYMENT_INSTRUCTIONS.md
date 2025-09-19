# Netlify Deployment Instructions

## Files to Upload to Netlify Drop

You need to upload these **2 files** to Netlify Drop:

### 1. `admin.html` - Admin Panel
- Complete admin interface for managing your VideoMax platform
- Features:
  - User management (activate/deactivate users)
  - Video management (view/delete videos)
  - Dashboard statistics
  - Secure admin login

### 2. `users.html` - User Interface  
- Complete user interface for your video platform
- Features:
  - User registration and login
  - Video browsing and viewing
  - Video upload functionality
  - User profile management

## How to Deploy

### Step 1: Upload to Netlify Drop
1. Go to [Netlify Drop](https://app.netlify.com/drop)
2. Drag and drop both `admin.html` and `users.html` files
3. Netlify will automatically deploy them

### Step 2: Configure API Connection
Both files need to connect to your Render-deployed backend:

**In admin.html:**
- Enter your Render app URL: `https://your-render-app.onrender.com`
- Use admin credentials to login

**In users.html:**
- Enter your Render app URL: `https://your-render-app.onrender.com`
- Users can register/login normally

### Step 3: Access Your Platform

After deployment, you'll get URLs like:
- **Admin Panel**: `https://your-site-name.netlify.app/admin.html`
- **User Interface**: `https://your-site-name.netlify.app/users.html`

## Features Overview

### Admin Panel (`admin.html`)
- 📊 Dashboard with user/video statistics
- 👥 User management (view, activate/deactivate)
- 🎥 Video management (view, delete)
- 🔐 Secure admin authentication
- 📱 Responsive design

### User Interface (`users.html`)
- 🔐 User registration and login
- 🎬 Video browsing and discovery
- 📤 Video upload with drag-and-drop
- 👤 User profile management
- 📱 Mobile-friendly interface

## Configuration

### Required Backend Endpoints
Your Render backend must have these endpoints:
- `POST /api/auth/login` - User/admin login
- `POST /api/auth/register` - User registration
- `GET /api/admin/dashboard` - Admin statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/videos` - Video management
- `GET /api/videos` - Public videos
- `POST /api/videos/upload` - Video upload

### CORS Configuration
Ensure your Render backend allows requests from your Netlify domain:
```javascript
app.use(cors({
  origin: ['https://your-netlify-site.netlify.app'],
  credentials: true
}));
```

## Security Features

- JWT token authentication
- Local storage for session management
- Input validation and sanitization
- Secure admin role verification
- HTTPS-only deployment on Netlify

## Customization

### Branding
- Update titles and headers in both HTML files
- Modify color schemes in CSS sections
- Add your logo/branding elements

### API URL
- Both files store API URL in localStorage
- Users only need to enter it once
- Automatically saved for future sessions

## Troubleshooting

### Connection Issues
- Verify your Render app URL is correct
- Check if Render app is running
- Ensure CORS is properly configured

### Login Issues
- Verify admin credentials in your database
- Check JWT token configuration
- Ensure user roles are set correctly

### Upload Issues
- Check file size limits on Render
- Verify upload endpoint is working
- Ensure proper file type validation

## Support

Both files are standalone and will work with any VideoMax backend deployment. Simply update the API URL to point to your Render application.