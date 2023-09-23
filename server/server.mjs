import { google } from 'googleapis';
import dotenv from 'dotenv';
import './telegramBot.mjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import {getError} from "./telegramBot.mjs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const idStreams = []

global.sendAlerts = true;

dotenv.config();
const liveBroadcastsStatus = {};
const youtube = google.youtube({ version: 'v3', auth: process.env.YOUTUBE_API_KEY });
let CHANNELS = [];

async function getLiveStreamId(channelId) {
    const response = await youtube.search.list({
        part: 'id',
        channelId: channelId,
        eventType: 'live',
        type: 'video',
        maxResults: 1
    });

    const liveBroadcast = response.data.items[0];

    if (liveBroadcast) {
        return liveBroadcast.id.videoId;
    } else {
        console.error(`Нет прямой трансляции у канала ${channelId}`);
        await getError(`No live broadcasts found for channel ${channelId}`)
        return null;
    }
}

async function getIdStreams() {
    const channels = process.env.CHANNELS.split(',').map(channel => {
        const [name, id] = channel.split(':');
        return {name, id};
    });

    const newIdStreams = [];

    for (const channel of channels) {
        const liveStreamId = await getLiveStreamId(channel.id);
        newIdStreams.push({name: channel.name, id: liveStreamId});
    }

    // Записать новые данные в idStreams.json
    fs.writeFileSync(path.join(__dirname, 'idStreams.json'), JSON.stringify(newIdStreams, null, 2));

    // Обновить глобальную переменную idStreams
    global.idStreams = newIdStreams;
}

getIdStreams()
    .catch(error => console.error('Error in getIdStreams function:', error));


function loadChannelIds() {
    const idStreamsPath = path.join(__dirname, 'idStreams.json');

    if (fs.existsSync(idStreamsPath)) {
        try {
            return JSON.parse(fs.readFileSync(idStreamsPath, 'utf-8'));
        } catch (error) {
            console.error(`Error reading or parsing idStreams.json: ${error}`);
            return [];
        }
    } else {
        console.error(`idStreams.json does not exist at path: ${idStreamsPath}`);
        return [];
    }
}


CHANNELS = loadChannelIds();
async function checkLiveBroadcasts() {
    for (const channel of CHANNELS) {
        try {
            const response = await youtube.videos.list({
                part: 'snippet,liveStreamingDetails,statistics',
                id: channel.id,
            });

            if (!response.data.items || response.data.items.length === 0) {
                console.log(`Ошибка: Видео с идентификатором ${channel.id} для канала ${channel.name} не найдено.`);
               await getError(`Ошибка: Видео с идентификатором ${channel.id} для канала ${channel.name} не найдено.`)
                liveBroadcastsStatus[channel.name] = { status: 'нет информации' };
                continue;
            }

            const video = response.data.items[0];
            const liveStatus = video.liveStreamingDetails;

            if (liveStatus && liveStatus.actualStartTime && !liveStatus.actualEndTime) {
                liveBroadcastsStatus[channel.name] = { status: 'В эфире' };

            } else {
                liveBroadcastsStatus[channel.name] = { status: 'Не в эфире' };

            }
        } catch (error) {S
            console.log(`Ошибка при получении данных для канала ${channel.name}:`, error);
           await getError(`Ошибка при получении данных для канала ${channel.name}:`)
            liveBroadcastsStatus[channel.name] = { status: 'нет информации' };
        }
    }

    // Сохраняем статус прямых трансляций в глобальном объекте
    global.liveBroadcastsStatus = liveBroadcastsStatus;
// console.log(liveBroadcastsStatus)
}

async function main() {


    await checkLiveBroadcasts();
    setInterval(async () => {
        await checkLiveBroadcasts();
         }, 180000); //
}
export async function updateFunction() {
    await  getIdStreams();
    CHANNELS = loadChannelIds()
    console.log(idStreams)
    main().then(() => {
        console.log('Главная функция, ок');
         getError('Main function completed successfully')
    }).catch((error) => {
        console.error('Главная функция, проблема:', error);
        getError('Главная функция, проблема:', error)
    });
}
main().then(() => {
    //console.log('Main function completed successfully.');
}).catch((error) => {
    console.error('Error in main function:', error);
});

