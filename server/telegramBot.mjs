import  {Telegraf} from 'telegraf';
import dotenv from 'dotenv';
import { updateFunction } from './server.mjs';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

bot.start((ctx) => ctx.reply('Добро пожаловать! Используйте команду /status, чтобы проверить статус прямых трансляций.'));

bot.command('alerton', (ctx) => {
    global.sendAlerts = true;// Переключаем значение переменной
    ctx.reply("Уведомления об ошибках включены");
});

bot.command('alertoff', (ctx) => {
    global.sendAlerts = false; // Переключаем значение переменной
    ctx.reply("Уведомления об ошибках выключены");
});

bot.command('status', (ctx) => {
    const liveBroadcastsStatus = global.liveBroadcastsStatus;
    let message = 'Состояние прямых трансляций:\n';

    for (const channelName in liveBroadcastsStatus) {
        const channelStatus = liveBroadcastsStatus[channelName];
        message += `Канал ${channelName}: ${channelStatus.status}\n`;
    }

    ctx.reply(message);
});
bot.command('url', (ctx) => {
    const idStreams = global.idStreams;
    idStreams.forEach(item => {
        ctx.reply (`${item.name}\n https://www.youtube.com/embed/${item.id}\n`)
    })



});

bot.command('update', (ctx) => {
    updateFunction().then(()=>{
        ctx.reply('Обновление выполнено.')
    }).catch((error)=>{
        ctx.reply('УПС, проблема:',error)
    });

});
 bot.command('help',(ctx)=>{
     let message=`
/status - получить статус трансляций
/url - получить URL трансляций
/update - обновление id трансляций,после остановки старого стрима
/alertoff - выключение уведомлений от бота 
/alerton - включение уведомлений от бота`

ctx.reply(message)
 })
bot.launch();
function checkNoBroadcasts() {
    const liveBroadcastsStatus = global.liveBroadcastsStatus;

    for (const channelName in liveBroadcastsStatus) {
        const channelStatus = liveBroadcastsStatus[channelName];

        if (channelStatus.status === 'Не в эфире'&& global.sendAlerts) {
            bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, `⚠️ Хьюстон у нас проблема канал ${channelName} не транслирует в данный момент.`);
        }
    }
}

//
function mesErr(ert){

        bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, ert)

}
export async function getError(ert) {
    mesErr(ert);


}
setInterval(checkNoBroadcasts, 20000); // Проверяем статус по заданному времени

export default bot;
