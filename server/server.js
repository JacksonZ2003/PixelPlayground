import { createClient } from 'redis';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const client = createClient({
    username: process.env.REDISUSERNAME,
    password: process.env.PASSWORD,
    socket: {
        host: process.env.REDISHOST,
        port: 18067
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

app.post('/store-pixels', async (req, res) => {
    const { pixels } = req.body;
    
    try {
        await client.set('pixels', JSON.stringify(pixels));
        res.status(200).send('Pixels stored successfully');
        broadcastPixels(pixels);
    } catch (err) {
        console.error('Error storing pixels:', err);
        res.status(500).send('Error storing pixels');
    }
});

app.get('/fetch-pixels', async (req, res) => {
    try {
        const pixels = await client.get('pixels');
        res.status(200).json(JSON.parse(pixels));
    } catch (err) {
        console.error('Error fetching pixels:', err);
        res.status(500).send('Error fetching pixels');
    }
});

const server = app.listen(process.env.PORT || 8080, '0.0.0.0', () => {
    console.log('Server started at http://localhost:' + process.env.PORT);
});
    
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
});

const broadcastPixels = (pixels) => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(pixels));
        }
    });
};
