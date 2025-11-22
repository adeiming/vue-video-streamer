import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = 1234

const assetsDir = path.resolve(__dirname, 'assets')
const distDir = path.resolve(__dirname, 'dist')

// API endpoint to get the list of videos
app.get('/api/videos', (req, res) => {
  fs.readdir(assetsDir, (err, files) => {
    if (err) {
      console.error("Could not list the directory.", err);
      // Create assets directory if it doesn't exist
      if (err.code === 'ENOENT') {
        fs.mkdirSync(assetsDir, { recursive: true });
        return res.json([]);
      }
      return res.status(500).json({ message: "Could not list the videos" });
    }

    // Filter for common video file extensions
    const videoFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.webm', '.ogg', '.mov', '.mkv'].includes(ext);
    });

    res.json(videoFiles);
  });
});

// Video streaming endpoint
app.get('/videos/:filename', (req, res) => {
  const videoPath = path.join(assetsDir, req.params.filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found');
  }

  // Get video file extension and determine content type
  const ext = path.extname(videoPath).toLowerCase();
  const mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
  };
  const contentType = mimeTypes[ext] || 'video/mp4'; // Default to mp4 if unknown

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Serve the Vue.js frontend (built files)
app.use(express.static(distDir));

// Handle SPA routing by redirecting all other requests to index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(
        `Frontend build not found. Please run 'npm run build'. ` +
        `If you are in development, you should run 'npm run dev' and access the app via Vite's dev server.`
    );
  }
});


app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running and accessible from your local network.`);
  console.log(`- On this computer: http://localhost:${port}`);
  console.log(`- On other devices: Find this computer's IP address and open http://<YOUR_IP_ADDRESS>:${port}`);
});
