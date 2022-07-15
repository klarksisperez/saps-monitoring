const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const EventHubReader = require("./scripts/event-hub-reader.js");

const iotHubConnectionString =
	process.env.IotHubConnectionString ||
	"HostName=raspi3-monitoring.azure-devices.net;SharedAccessKeyName=service;SharedAccessKey=P9yYhI3nKYwlhS0Pb0P6rmUd525L6G0JbSDZpsTf9wU=";
if (!iotHubConnectionString) {
	console.error(
		`Environment variable IotHubConnectionString must be specified.`
	);
	return;
}
console.log(`Using IoT Hub connection string [${iotHubConnectionString}]`);

const eventHubConsumerGroup =
	process.env.EventHubConsumerGroup || "telConsumerGroup";
console.log(eventHubConsumerGroup);
if (!eventHubConsumerGroup) {
	console.error(
		`Environment variable EventHubConsumerGroup must be specified.`
	);
	return;
}
console.log(`Using event hub consumer group [${eventHubConsumerGroup}]`);

// Redirect requests to the public subdirectory to the root
const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res /* , next */) => {
	res.redirect("/");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.broadcast = (data) => {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			try {
				console.log(`Broadcasting data ${data}`);
				client.send(data);
			} catch (e) {
				console.error(e);
			}
		}
	});
};

server.listen(process.env.PORT || "5000", () => {
	console.log("Listening on %d.", server.address().port);
});

var nodemailer = require("nodemailer");

//real values

var transporter = nodemailer.createTransport({
	service: "hotmail",
	auth: {
		user: "sapsdmn@gmail.com",
		pass: "sapsadmin1234",
	},
});

//test
/*
var transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'adelbert.purdy31@ethereal.email',
    pass: 'Msz1dV6YWa55qweReT'
  }
});
*/
const eventHubReader = new EventHubReader(
	iotHubConnectionString,
	eventHubConsumerGroup
);

(async () => {
	await eventHubReader.startReadMessage((message, date, deviceId) => {
		try {
			const payload = {
				IotData: message,
				MessageDate: date || Date.now().toISOString(),
				DeviceId: deviceId,
			};

			wss.broadcast(JSON.stringify(payload));

			const smSensor0Parsed = parseFloat(payload.IotData.smSensor0).toFixed(2);
			const temperatureParsed = parseFloat(payload.IotData.temperature).toFixed(
				2
			);
			const humidityParsed = parseFloat(payload.IotData.humidity).toFixed(2);
			const lightParsed = parseFloat(payload.IotData.light).toFixed(2);
			const html =
				"<h1>Soil Moisture Warning!</h1><p>Soil Moisture within smSensor0's area is around <b>" +
				smSensor0Parsed +
				"%</b>, which is considered insufficient. The system will pump water within 3-5 minutes to ensure <b><i>Plant Sustainability</i></b>.</p><h2>Summary</h2><ul><li>Temperature: <b>" +
				temperatureParsed +
				"°C</b></li><li>Humidity: <b>" +
				humidityParsed +
				"%</b></li><li>Lux: <b>" +
				lightParsed +
				"lx</b></li><li>smSensor0: <b>" +
				smSensor0Parsed +
				"%</b></li></ul>";

			if (payload.IotData.smSensor0 < 60) {
				var mailOptions = {
					from: "sapsdmn@gmail.com",
					to: "jasper.sisperez@gmail.com",
					subject: "Soil Moisture Warning",
					text:
						"Soil Moisture within smSensor0's area is around " +
						smSensor0Parsed +
						"%, which is considered insufficient. The system will pump water within 3-5 minutes to ensure plant sustainability... SUMMARY: Temperature - " +
						temperatureParsed +
						"°C, Humidity - " +
						humidityParsed +
						"%, Lux - " +
						lightParsed +
						"lx, smSensor0 - " +
						smSensor0Parsed +
						"%.",
					html: html,
				};
				transporter.sendMail(mailOptions, function (error, info) {
					if (error) {
						console.log(error);
					} else {
						console.log("Email sent: " + info.response);
					}
				});
			}
		} catch (err) {
			console.error("Error broadcasting: [%s] from [%s].", err, message);
		}
	});
})().catch();
