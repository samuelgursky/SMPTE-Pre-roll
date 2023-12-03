import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Select, message } from 'antd';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { fontBase64 } from '/public/fonts/Base64-Arial.js';

const { Option } = Select;

const App = () => {
  const [timebase, setTimebase] = useState('23.976');
  const [filmTitle, setFilmTitle] = useState('');
  const [startingTimecode, setStartingTimecode] = useState('00:59:50:00');
  const [resolution, setResolution] = useState('1280x720');
  const [href, setHref] = useState('');
  const [downloadFileName, setDownloadFileName] = useState('');
  const ffmpeg = useRef();

  const generatePrerollVideo = async () => {
    try {
      if (!ffmpeg.current.isLoaded()) {
        await ffmpeg.current.load();
      }

      const arialBase64 = fontBase64;
      const fontData = await fetchFile(`data:font/ttf;base64,${arialBase64}`);
      ffmpeg.current.FS('writeFile', 'Arial.ttf', fontData);

      const fps = parseFloat(timebase);
      const [width, height] = resolution.split('x').map(Number);

      const prerollCommand = [
        '-f', 'lavfi',
        '-i', `color=c=black:s=${width}x${height}:r=${fps}:d=8`,
        '-f', 'lavfi',
        '-i', `color=c=white:s=${width}x${height}:r=${fps}:d=${1 / fps}`,
        '-f', 'lavfi',
        '-i', `color=c=black:s=${width}x${height}:r=${fps}:d=${10 - 8 - (1 / fps)}`,
        '-filter_complex', `[0:v]drawtext=fontfile=Arial.ttf:text='${filmTitle.replaceAll("'", "\\'")}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2[v0]; [1:v]drawtext=fontfile=Arial.ttf:text='2':fontcolor=black:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2[v1]; [v0][v1][2:v]concat=n=3:v=1:a=0[out]`,
        '-map', '[out]',
        '-c:v', 'prores',
        '-profile:v', '3',
        '-timecode', startingTimecode,
        'preroll.mov',
      ];

      await ffmpeg.current.run(...prerollCommand);
      const data = ffmpeg.current.FS('readFile', 'preroll.mov');
      const blob = new Blob([data.buffer], { type: 'video/quicktime' });
      const url = URL.createObjectURL(blob);
      setHref(url);
      setDownloadFileName('preroll.mov');
    } catch (error) {
      console.error('Error generating preroll video:', error);
      message.error('Failed to generate preroll video');
    }
  };

  useEffect(() => {
    ffmpeg.current = createFFmpeg({
      log: true,
      corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
    });
  }, []);

  return (
    <div className="page-app">
      <h1 align="center">Preroll Sync Video Generator</h1>

      <div className="input-group">
        <label htmlFor="timebase-select">Select Frame Rate:</label>
        <Select
          id="timebase-select"
          value={timebase}
          style={{ width: 120 }}
          onChange={setTimebase}
        >
          <Option value="23.976">23.976 fps</Option>
          <Option value="24">24 fps</Option>
          <Option value="25">25 fps</Option>
          <Option value="29.97">29.97 fps</Option>
          <Option value="30">30 fps</Option>
        </Select>

        <label htmlFor="resolution-select">Select Resolution:</label>
        <Select
          id="resolution-select"
          value={resolution}
          style={{ width: 200 }}
          onChange={(value) => setResolution(value)}
        >
          <Option value="1280x720">1280x720</Option>
          <Option value="1920x1080">1920x1080</Option>
          <Option value="3840x2160">3840x2160</Option>
        </Select>

        <Input
          value={filmTitle}
          placeholder="Enter film title"
          onChange={(event) => setFilmTitle(event.target.value)}
        />

        <Input
          value={startingTimecode}
          placeholder="Enter starting timecode"
          onChange={(event) => setStartingTimecode(event.target.value)}
        />

        <Button type="primary" onClick={generatePrerollVideo}>
          Generate Preroll Video
        </Button>
      </div>

      {href && (
        <div>
          <a href={href} download={downloadFileName}>
            Download Preroll Video
          </a>
        </div>
      )}
    </div>
  );
};

export default App;