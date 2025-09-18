const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

// Convert video to multiple resolutions (144p, 360p, 720p, 1080p, 4K)
const resolutions = [
  { name: '144p', size: '256x144' },
  { name: '360p', size: '640x360' },
  { name: '720p', size: '1280x720' },
  { name: '1080p', size: '1920x1080' },
  { name: '4K', size: '3840x2160' }
];

function convertVideo(inputPath, outputDir, cb) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let completed = 0;
  let errors = [];

  resolutions.forEach(res => {
    const outputPath = path.join(outputDir, `${res.name}.mp4`);
    ffmpeg(inputPath)
      .size(res.size)
      .output(outputPath)
      .on('end', () => {
        // Generate HLS playlist and segments for each resolution
        const hlsDir = path.join(outputDir, `${res.name}_hls`);
        if (!fs.existsSync(hlsDir)) {
          fs.mkdirSync(hlsDir, { recursive: true });
        }
        ffmpeg(outputPath)
          .output(path.join(hlsDir, 'index.m3u8'))
          .addOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls'
          ])
          .on('end', () => {
            completed++;
            if (completed === resolutions.length) cb(errors.length ? errors : null);
          })
          .on('error', err => {
            errors.push({ resolution: res.name, error: err });
            completed++;
            if (completed === resolutions.length) cb(errors.length ? errors : null);
          })
          .run();
      })
      .on('error', err => {
        errors.push({ resolution: res.name, error: err });
        completed++;
        if (completed === resolutions.length) cb(errors.length ? errors : null);
      })
      .run();
  });
}

module.exports = { convertVideo, resolutions };