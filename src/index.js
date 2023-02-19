require("dotenv").config();
/* Includes */
const fs = require("fs");

/* gRPC */
const { client, serviceMetadata } = require("./grpc");
const CHUNK_SIZE = 4000;
const audio = fs.readFileSync(__dirname + "/beluga.ogg");
const request = {
  config: {
    specification: {
      languageCode: "auto",
      profanityFilter: true,
      model: "general",
      partialResults: true,
      audioEncoding: "OGG_OPUS",
      sampleRateHertz: "8000",
    },
    folderId: process.env.FOLDER_ID,
  },
};
const FREQUENCY = 250; // Частота отправки аудио в миллисекундах.

let call = client.StreamingRecognize(serviceMetadata, (error, news) => {
  if (!error) throw error;
});
// Отправить сообщение с настройками распознавания.
call.write(request);

// Прочитать аудиофайл и отправить его содержимое порциями.
let i = 1;
const interval = setInterval(() => {
  if (i * CHUNK_SIZE <= audio.length) {
    const chunk = new Uint16Array(
      audio.slice((i - 1) * CHUNK_SIZE, i * CHUNK_SIZE)
    );
    const chunkBuffer = Buffer.from(chunk);
    call.write({ audioContent: chunkBuffer });
    i++;
  } else {
    call.end();
    clearInterval(interval);
  }
}, FREQUENCY);

// Обработать ответы сервера и вывести результат в консоль.
call.on("data", (response) => {
  console.log("Start chunk: ");
  response.chunks[0].alternatives.forEach((alternative) => {
    console.log("alternative: ", alternative.text);
  });
});

call.on("error", (response) => {
  // Обрабатываем ошибки
  console.log(response);
});
