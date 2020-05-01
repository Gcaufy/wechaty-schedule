const { Room, Contact  } = require('wechaty');
const fs = require('fs');

const Rule = {
  data: null,
  mtime: '',
  executed: {},

  fetch (file) {
    try {
      let mtime = fs.statSync(file).mtime;
      if (!this.data || mtime - this.mtime !== 0) {
        console.log('Reload task file: ' + mtime);
        this.data = JSON.parse(fs.readFileSync(file));
        this.mtime = +mtime;
      }
    } catch (e) {
      console.log(e);
    }
    return this.data;
  },
  execute (bot, taskName, rule) {
    this.set(taskName);
  },
  isExcuted(taskName) {
    return !!this.executed[taskName];
  },
  reset (taskName) {
    this.executed[taskName] = false;
  },
  set (taskName) {
    this.executed[taskName] = true;
  }
}

const timeParse = (time, timeZone) => {
  let date = new Date(time);
  if (!isNaN(+date)) {
    return {
      date: date,
      everyday: false
    };
  }
  if (!/^\d{1,2}(:\d{1,2})?(:\d{1,2})?$/.test(time)) {
    return null;
  }
  let tmp = time.split(':');
  let now = getDate(timeZone);
  return {
    date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), tmp[0], tmp[1] || 0, tmp[2] || 0),
    everyday: true
  };
};

const getDate = (timeZone) => {
  if (timeZone === undefined)
    return new Date();
  let gtmDate = +new Date() + new Date().getTimezoneOffset() * 60 * 1000;
  return new Date(gtmDate + timeZone * 60 * 60 * 1000);
};

const executeTask = async function (roomName, contactName, content) {
  if (roomName && typeof roomName === 'string')
    roomName = [roomName];
  if (contactName && typeof contactName === 'string')
    contactName = [contactName];
  if (content && typeof content === 'string')
    content = [content];

  if (roomName) {
    let rooms = await Promise.all(roomName.map(v => Room.find({ topic: v })));
    rooms = rooms.filter((room, i) => {
      if (!room) {
        console.log(`Can't find room ${roomName[i]}`);
        return false;
      }
      return true;
    });
    if (contactName) {
      let contacts = await Promise.all(contactName.map(v => Contact.find({ name: v })));
      contacts = contacts.filter((contact, i) => {
        if (!contact) {
          console.log(`Can't find contact ${contactName[i]}`);
          return false;
        }
        return true;
      });

      rooms.forEach(room => content.forEach(v => room.say(v, contacts)));
    } else {
      rooms.forEach(room => content.forEach(v => room.say(v)));
    }
  } else if (contactName) {
    let contacts = await Promise.all(contactName.map(v => Contact.find({ name: v })));
    contacts = contacts.filter((contact, i) => {
      if (!contact) {
        console.log(`Can't find contact ${contactName[i]}`);
        return false;
      }
      return true;
    });
    contacts.forEach(contact => content.forEach(v => contact.say(v)));
  }
}

const DEFAULT_CONFIG = {
  tasks: './tasks.json'
};

module.exports = function WechatySchedulePlugin (config = {}) {
  config = Object.assign({}, DEFAULT_CONFIG, config);

  return function (bot) {
    bot.on('heartbeat', function () {
      // if rule file is changed, will get the new rule.
      let rules = Rule.fetch(config.tasks);

      for (let taskName in rules) {
        let rule = rules[taskName];
        let time = timeParse(rule.time, config.timeZone);
        if (time) {
          if (time.date - getDate(config.timeZone) > 0) { // does not reach the schedule time
            if (time.everyday && Rule.isExcuted(taskName)) {
              Rule.reset(taskName);
            }
          } else {
            // task is not excuted and time is 10 mins closed
            if (!Rule.isExcuted(taskName) && getDate(config.timeZone) - time.date <= 10 * 60 * 1000) {
              console.log(`[${taskName}] - Executing task in ${getDate(config.timeZone).toString()}`);
              Rule.set(taskName);
              executeTask(rule.room, rule.contact, rule.content);
            }
          }
        } else {
          console.warn(`[${taskName}] - Invalid time : "${rules[taskName].time}"`);
        }
      }
    });
  }
}
