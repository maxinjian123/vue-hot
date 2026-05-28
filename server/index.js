const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const keywordsRouter = require('./routes/keywords');
const hotTopicsRouter = require('./routes/hotTopics');
const notificationsRouter = require('./routes/notifications');
const settingsRouter = require('./routes/settings');
const searchRouter = require('./routes/search');
const dashboardRouter = require('./routes/dashboard');
const scheduler = require('./services/scheduler');
const settingsCache = require('./services/settingsCache');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

settingsCache.setIoInstance(io);

io.on('connection', (socket) => {
  console.log(`[SocketIO] 客户端连接成功: ${socket.id} (total: ${io.engine.clientsCount})`);

  socket.emit('settings:current', settingsCache.getSettings());

  socket.on('disconnect', (reason) => {
    console.log(`[SocketIO] 客户端断开连接: ${socket.id}, 原因: ${reason}`);
  });

  socket.on('error', (err) => {
    console.error(`[SocketIO] 客户端错误 (${socket.id}):`, err.message);
  });
});

app.use(cors());
app.use(express.json());

app.use('/api/keywords', keywordsRouter);
app.use('/api/hot-topics', hotTopicsRouter);
app.use('/api/notifications', notificationsRouter);
app.use((req, res, next) => {
  req.io = io;
  next();
});
app.use('/api/settings', settingsRouter);
app.use('/api/search', searchRouter);
app.use('/api/dashboard', dashboardRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    websocketClients: io.engine.clientsCount,
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await settingsCache.loadSettings();

    httpServer.listen(PORT, () => {
      console.log(`[Server] 热点哨兵已启动，监听端口: ${PORT}`);
      console.log(`[SocketIO] WebSocket 服务器已准备就绪`);
      scheduler.start();
    });
  } catch (err) {
    console.error('[Server] 热点哨兵启动失败:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = { app, httpServer, io };
