const { Wechaty  } = require('wechaty');
const bot = Wechaty.instance({profile: 'WECHATY_PROFILE'});
const WechatySchedulePlugin = require('../index');

bot.use(WechatySchedulePlugin())
.on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
.on('login',       user => console.log(`User ${user} logined`))
.init();

