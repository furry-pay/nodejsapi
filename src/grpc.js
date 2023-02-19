require("dotenv").config();
const fs = require("fs");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = __dirname + "/../yandex/cloud/ai/stt/v2/stt_service.proto";
const options = {
  includeDirs: [__dirname + "/node_modules/google-proto-files", ".."],
};
let serviceMetadata = new grpc.Metadata();
serviceMetadata.add("authorization", `Api-Key ${process.env.YANDEX_API}`);
var packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const StreamingRecognize =
  grpc.loadPackageDefinition(packageDefinition).yandex.cloud.ai.stt.v2
    .SttService;
const client = new StreamingRecognize(
  "stt.api.cloud.yandex.net:443",
  grpc.credentials.createSsl(fs.readFileSync("./roots.pem"))
);
module.exports = { client, serviceMetadata };
