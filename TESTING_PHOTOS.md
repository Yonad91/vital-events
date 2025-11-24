# How to Test Photo Display in Certificates

## Step 1: Start Your Server

Open a terminal/command prompt and navigate to your project directory:

```bash
cd C:\Users\Jonah\Desktop\vital-events
```

Then start your server (depending on your setup):

```bash
# If using npm
npm run dev

# OR if using node directly
node server/server.js
```

**Keep this terminal window open** - this is where you'll see all the console logs! 📺

## Step 2: Generate a Certificate

You have two ways to generate a certificate:

### Option A: Through the Web Interface (Easiest)

1. Open your web browser and go to your application (usually `http://localhost:5174` or similar)
2. Log in as a user who has an approved certificate request
3. Navigate to the "My Certificates" or "Certificate Requests" page
4. Find a certificate request that is **approved** (status = "approved")
5. Click the **"Generate"** button (usually green button that says "Generate" or "ይፍጠሩ")

### Option B: Using API (For Testing)

If you want to test directly via API, you can use:

```bash
# Using curl (in a new terminal)
curl -X POST http://localhost:5000/api/users/certificates/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"eventId": "YOUR_EVENT_ID", "requestId": "YOUR_REQUEST_ID"}'
```

## Step 3: Watch the Console Logs

**Go back to the terminal where your server is running** and look for these log messages:

### ✅ What You Should See (Success):

```
📸 Extracting photos for event type: birth
📋 Full event data keys: [list of all keys]
📋 Photo/image fields found: ['childPhoto', 'idCardImage', ...]
   childPhoto = childPhoto-1234567890.jpg
  🔍 Trying field: childPhoto = childPhoto-1234567890.jpg
🔍 Resolving photo path for: "childPhoto-1234567890.jpg"
📁 Uploads path: C:\Users\Jonah\Desktop\vital-events\server\uploads
   Cleaned filename: "childPhoto-1234567890.jpg"
📂 Trying 1 - Direct path: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
✅ Found photo at: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
  ✅ Found photo via field childPhoto: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
📸 Photo extraction result: primary=✅ C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg, secondary=❌
🖼️ [renderTemplate] Processing photos: { hasPrimary: true, hasSecondary: false, ... }
  🔄 [renderTemplate] Converting primary photo to base64: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
🖼️ Encoding photo to base64: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
✅ Successfully encoded photo to base64 (size: 50000 chars)
  ✅ [renderTemplate] primary photo encoded successfully (50000 chars, starts with: data:image/jpeg;base64,/9j/4AAQSkZJRg...)
✅ [renderTemplate] All photo placeholders replaced successfully
```

### ❌ What You Might See (Problems):

**Problem 1: Photo field not found**
```
📋 Photo/image fields found: []
❌ No photo fields found in data
📸 Photo extraction result: primary=❌, secondary=❌
```
**Solution:** Check that your event data actually has a photo field (like `childPhoto`, `wifePhoto`, etc.)

**Problem 2: Photo file not found**
```
🔍 Resolving photo path for: "childPhoto-1234567890.jpg"
📁 Uploads path: C:\Users\Jonah\Desktop\vital-events\server\uploads
📋 Total files in uploads directory: 5
📋 Sample files (first 20): file1.jpg, file2.png, ...
❌ Photo not found: childPhoto-1234567890.jpg
```
**Solution:** 
- Check if the file actually exists in `C:\Users\Jonah\Desktop\vital-events\server\uploads`
- The filename in the database must match the actual filename in the uploads folder

**Problem 3: Base64 encoding failed**
```
🖼️ Encoding photo to base64: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
❌ Photo file does not exist: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
❌ Failed to encode primary photo: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
```
**Solution:** The file path is wrong or the file doesn't exist. Check the uploads directory.

## Step 4: Verify the Certificate

After generation:

1. **Download the certificate** from the UI
2. **Open the PDF or HTML file**
3. **Check if the photo appears** in the certificate

## Quick Debugging Tips

### Check if photos exist in uploads folder:

```bash
# In Windows PowerShell
dir C:\Users\Jonah\Desktop\vital-events\server\uploads

# Or in Command Prompt
dir C:\Users\Jonah\Desktop\vital-events\server\uploads
```

### Check what photo field names are in your database:

You can add a temporary log in your code or check the database directly. The photo field should be something like:
- `childPhoto` for birth certificates
- `wifePhoto` or `husbandPhoto` for marriage certificates
- `deceasedPhoto` for death certificates
- `divorceSpouse1Photo` or `divorceSpouse2Photo` for divorce certificates

## Still Having Issues?

If photos still don't display:

1. **Copy the entire console log output** from when you generate a certificate
2. **Look for any ❌ or ⚠️ messages** - these indicate problems
3. **Check the specific error messages** - they will tell you exactly what's wrong

The logs will show you:
- ✅ Which fields were checked
- ✅ Which paths were tried
- ✅ Whether files were found
- ✅ Whether base64 encoding succeeded
- ✅ Whether photos were embedded in the template

## Example: Full Successful Log Output

```
🎯 Starting exact template certificate generation...
Event type: birth
Certificate ID: CERT-1234567890-1234567890
📱 Generating QR code...
✅ QR code generated
📊 Certificate data extracted: ['certificateId', 'registrationNumber', 'photos', ...]
📸 Photos in certificate data: { primary: '✅ Found', secondary: '❌ Missing', primaryPath: 'C:\\Users\\Jonah\\Desktop\\vital-events\\server\\uploads\\childPhoto-1234567890.jpg', secondaryPath: 'N/A' }
📄 Generating exact template HTML...
📸 Extracting photos for event type: birth
📋 Full event data keys: ['childPhoto', 'childName', 'fatherName', ...]
📋 Photo/image fields found: ['childPhoto']
   childPhoto = childPhoto-1234567890.jpg
  🔍 Trying field: childPhoto = childPhoto-1234567890.jpg
🔍 Resolving photo path for: "childPhoto-1234567890.jpg"
📁 Uploads path: C:\Users\Jonah\Desktop\vital-events\server\uploads
   Cleaned filename: "childPhoto-1234567890.jpg"
📂 Trying 1 - Direct path: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
✅ Found photo at: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
  ✅ Found photo via field childPhoto: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
📸 Photo extraction result: primary=✅ C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg, secondary=❌
🖼️ [renderTemplate] Processing photos: { hasPrimary: true, hasSecondary: false, primaryPath: 'C:\\Users\\Jonah\\Desktop\\vital-events\\server\\uploads\\childPhoto-1234567890.jpg', secondaryPath: 'N/A' }
  🔄 [renderTemplate] Converting primary photo to base64: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
🖼️ Encoding photo to base64: C:\Users\Jonah\Desktop\vital-events\server\uploads\childPhoto-1234567890.jpg
✅ Successfully encoded photo to base64 (size: 50000 chars)
  ✅ [renderTemplate] primary photo encoded successfully (50000 chars, starts with: data:image/jpeg;base64,/9j/4AAQSkZJRg...)
🖼️ [renderTemplate] Resolved photo values: { photoPrimaryLength: 50000, photoSecondaryLength: 0, photoPrimaryDisplay: 'block', photoPlaceholderDisplay: 'none' }
🖼️ [renderTemplate] Found 3 photo placeholders in template
  🔄 [renderTemplate] Replacing {{photoPrimary}} with value length: 50000
  🔄 [renderTemplate] Replacing {{photoPrimaryDisplay}} with value length: 4
  🔄 [renderTemplate] Replacing {{photoPlaceholderDisplay}} with value length: 4
✅ [renderTemplate] All photo placeholders replaced successfully
✅ Exact template HTML generated
🔄 Attempting PDF generation...
✅ PDF generated successfully at: C:\Users\Jonah\Desktop\vital-events\server\certificates\CERT-1234567890-1234567890.pdf
```

If you see all these ✅ messages, the photo should be displaying in your certificate!

