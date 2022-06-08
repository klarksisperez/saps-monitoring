/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

$(document).ready(() => {
	// if deployed to a site supporting SSL, use wss://
	const protocol = document.location.protocol.startsWith("https")
		? "wss://"
		: "ws://";
	const webSocket = new WebSocket(protocol + location.host);
	// A class for holding the last N points of telemetry for a device

	class DeviceData {
		constructor(deviceId) {
			this.deviceId = deviceId;
			this.maxLen = 50;
			this.timeData = new Array(this.maxLen);
			this.temperatureData = new Array(this.maxLen);
			this.humidityData = new Array(this.maxLen);

			this.smSensor0Data = new Array(this.maxLen);
			this.smSensor1Data = new Array(this.maxLen);
			this.smSensor2Data = new Array(this.maxLen);
			this.smSensor3Data = new Array(this.maxLen);
			this.smSensor4Data = new Array(this.maxLen);
			this.smSensor5Data = new Array(this.maxLen);
			this.smSensor6Data = new Array(this.maxLen);
			this.smSensor7Data = new Array(this.maxLen);
		}

		addData(
			time,
			temperature,
			humidity,
			smSensor0,
			smSensor1,
			smSensor2,
			smSensor3,
			smSensor4,
			smSensor5,
			smSensor6,
			smSensor7
		) {
			this.timeData.push(time);
			this.temperatureData.push(temperature);
			this.humidityData.push(humidity || null);

			this.smSensor0Data.push(smSensor0);
			this.smSensor1Data.push(smSensor1);
			this.smSensor2Data.push(smSensor2);
			this.smSensor3Data.push(smSensor3);
			this.smSensor4Data.push(smSensor4);
			this.smSensor5Data.push(smSensor5);
			this.smSensor6Data.push(smSensor6);
			this.smSensor7Data.push(smSensor7);

			if (this.timeData.length > this.maxLen) {
				this.timeData.shift();
				this.temperatureData.shift();
				this.humidityData.shift();

				this.smSensor0Data.shift();
				this.smSensor1Data.shift();
				this.smSensor2Data.shift();
				this.smSensor3Data.shift();
				this.smSensor4Data.shift();
				this.smSensor5Data.shift();
				this.smSensor6Data.shift();
				this.smSensor7Data.shift();
			}
		}
	}

	// All the devices in the list (those that have been sending telemetry)
	class TrackedDevices {
		constructor() {
			this.devices = [];
		}

		// Find a device based on its Id
		findDevice(deviceId) {
			for (let i = 0; i < this.devices.length; ++i) {
				if (this.devices[i].deviceId === deviceId) {
					return this.devices[i];
				}
			}

			return undefined;
		}

		getDevicesCount() {
			return this.devices.length;
		}
	}

	const trackedDevices = new TrackedDevices();

	// Define the chart axes
	const chartData = {
		datasets: [
			{
				fill: false,
				label: "Temperature",
				yAxisID: "Temperature",
				borderColor: "rgba(222, 160, 87, 1)",
				pointBoarderColor: "rgba(222, 160, 87, 1)",
				backgroundColor: "rgba(222, 160, 87, 0.5)",
				pointHoverBackgroundColor: "rgba(222, 160, 87, 1)",
				pointHoverBorderColor: "rgba(222, 160, 87, 1)",
				spanGaps: true,
			},
			{
				fill: false,
				label: "Humidity",
				yAxisID: "Humidity",
				borderColor: "rgba(167, 96, 255, 1)",
				pointBoarderColor: "rgba(167, 96, 255, 1)",
				backgroundColor: "rgba(167, 96, 255, 0.5)",
				pointHoverBackgroundColor: "rgba(167, 96, 255, 1)",
				pointHoverBorderColor: "rgba(167, 96, 255, 1)",
				spanGaps: true,
			},
		],
	};

	const chartOptions = {
		scales: {
			yAxes: [
				{
					id: "Temperature",
					type: "linear",
					scaleLabel: {
						labelString: "Temperature (ºC)",
						display: true,
					},
					position: "left",
				},
				{
					id: "Humidity",
					type: "linear",
					scaleLabel: {
						labelString: "Humidity (%)",
						display: true,
					},
					position: "right",
				},
			],
		},
	};

	// Get the context of the canvas element we want to select
	const ctx = document.getElementById("iotChart").getContext("2d");
	const myLineChart = new Chart(ctx, {
		type: "line",
		data: chartData,
		options: chartOptions,
	});

	// Manage a list of devices in the UI, and update which device data the chart is showing
	// based on selection
	let needsAutoSelect = true;
	const deviceCount = document.getElementById("deviceCount");
	const listOfDevices = document.getElementById("listOfDevices");
	function OnSelectionChange() {
		const device = trackedDevices.findDevice(
			listOfDevices[listOfDevices.selectedIndex].text
		);
		chartData.labels = device.timeData;
		chartData.datasets[0].data = device.temperatureData;
		chartData.datasets[1].data = device.humidityData;
		myLineChart.update();
	}
	listOfDevices.addEventListener("change", OnSelectionChange, false);

	// When a web socket message arrives:
	// 1. Unpack it
	// 2. Validate it has date/time and temperature
	// 3. Find or create a cached device to hold the telemetry data
	// 4. Append the telemetry data
	// 5. Update the chart UI
	webSocket.onmessage = function onMessage(message) {
		try {
			const messageData = JSON.parse(message.data);
			console.log(messageData);

			// time and either temperature or humidity are required
			if (
				!messageData.MessageDate ||
				(!messageData.IotData.temperature &&
					!messageData.IotData.humidity &&
					!messageData.IotData.smSensor0 &&
					!messageData.IotData.smSensor1 &&
					!messageData.IotData.smSensor2 &&
					!messageData.IotData.smSensor3 &&
					!messageData.IotData.smSensor4 &&
					!messageData.IotData.smSensor5 &&
					!messageData.IotData.smSensor6 &&
					!messageData.IotData.smSensor7)
			) {
				return;
			}

			// find or add device to list of tracked devices
			const existingDeviceData = trackedDevices.findDevice(
				messageData.DeviceId
			);

			if (existingDeviceData) {
				existingDeviceData.addData(
					messageData.MessageDate,
					messageData.IotData.temperature,
					messageData.IotData.humidity,

					messageData.IotData.smSensor0,
					messageData.IotData.smSensor1,
					messageData.IotData.smSensor2,
					messageData.IotData.smSensor3,
					messageData.IotData.smSensor4,
					messageData.IotData.smSensor5,
					messageData.IotData.smSensor6,
					messageData.IotData.smSensor7
				);
			} else {
				const newDeviceData = new DeviceData(messageData.DeviceId);
				trackedDevices.devices.push(newDeviceData);
				const numDevices = trackedDevices.getDevicesCount();
				deviceCount.innerText =
					numDevices === 1
						? `${numDevices} device: `
						: `${numDevices} devices: `;
				newDeviceData.addData(
					messageData.MessageDate,
					messageData.IotData.temperature,
					messageData.IotData.humidity,

					messageData.IotData.smSensor0,
					messageData.IotData.smSensor1,
					messageData.IotData.smSensor2,
					messageData.IotData.smSensor3,
					messageData.IotData.smSensor4,
					messageData.IotData.smSensor5,
					messageData.IotData.smSensor6,
					messageData.IotData.smSensor7
				);

				// add device to the UI list
				const node = document.createElement("option");
				const nodeText = document.createTextNode(messageData.DeviceId);
				node.appendChild(nodeText);
				listOfDevices.appendChild(node);

				// if this is the first device being discovered, auto-select it
				if (needsAutoSelect) {
					needsAutoSelect = false;
					listOfDevices.selectedIndex = 0;
					OnSelectionChange();
				}
			}
			myLineChart.update();

			// DATA READING ON WEB

			//Time and Date
			document.getElementById("lastUpdated").innerHTML =
				"Last Updated: " + document.lastModified;

			//Latest Temperature
			document.getElementById("temp").innerHTML =
				"Temperature: " +
				parseFloat(messageData.IotData.temperature).toFixed(2) +
				"°C";

			//Latest Humidity
			document.getElementById("humid").innerHTML =
				"Humidity: " +
				parseFloat(messageData.IotData.humidity).toFixed(2) +
				"%";

			//SENSORS

			//SM0
			document.getElementById("smSensor0").innerHTML =
				" Soil Moisture Sensor #1: " +
				parseFloat(messageData.IotData.smSensor0).toFixed(2) +
				"%";
			if (parseFloat(messageData.IotData.smSensor0).toFixed(2) <= 60) {
				document.getElementById("smSensor0").style.background = "red";
			} else {
				document.getElementById("smSensor0").style.background = "green";
			}
			document.getElementById("smSensor0").style.width = `${parseFloat(
				messageData.IotData.smSensor0
			).toFixed(2)}%`;

			//SM1
			document.getElementById("smSensor1").innerHTML =
				" Soil Moisture Sensor #2: " +
				parseFloat(messageData.IotData.smSensor1).toFixed(2) +
				"%";
			document.getElementById("smSensor1").style.width = `${parseFloat(
				messageData.IotData.smSensor1
			).toFixed(2)}%`;

			if (parseFloat(messageData.IotData.smSensor1).toFixed(2) <= 60) {
				document.getElementById("smSensor1").style.background = "red";
			} else {
				document.getElementById("smSensor1").style.background = "green";
			}

			//SM2
			document.getElementById("smSensor2").innerHTML =
				" Soil Moisture Sensor #3: " +
				parseFloat(messageData.IotData.smSensor2).toFixed(2) +
				"%";
			document.getElementById("smSensor2").style.width = `${parseFloat(
				messageData.IotData.smSensor2
			).toFixed(2)}%`;

			if (parseFloat(messageData.IotData.smSensor2).toFixed(2) <= 60) {
				document.getElementById("smSensor2").style.background = "red";
			} else {
				document.getElementById("smSensor2").style.background = "green";
			}

			//SM3
			document.getElementById("smSensor3").innerHTML =
				" Soil Moisture Sensor #4: " +
				parseFloat(messageData.IotData.smSensor3).toFixed(2) +
				"%";
			document.getElementById("smSensor3").style.width = `${parseFloat(
				messageData.IotData.smSensor3
			).toFixed(2)}%`;

			if (parseFloat(messageData.IotData.smSensor3).toFixed(2) <= 60) {
				document.getElementById("smSensor3").style.background = "red";
			} else {
				document.getElementById("smSensor3").style.background = "green";
			}

			//SM4
			document.getElementById("smSensor4").innerHTML =
				" Soil Moisture Sensor #5: " +
				parseFloat(messageData.IotData.smSensor4).toFixed(2) +
				"%";
			document.getElementById("smSensor4").style.width = `${parseFloat(
				messageData.IotData.smSensor4
			).toFixed(2)}%`;

			if (parseFloat(messageData.IotData.smSensor4).toFixed(2) <= 60) {
				document.getElementById("smSensor4").style.background = "red";
			} else {
				document.getElementById("smSensor4").style.background = "green";
			}

			//SM5
			document.getElementById("smSensor5").innerHTML =
				" Soil Moisture Sensor #6: " +
				parseFloat(messageData.IotData.smSensor5).toFixed(2) +
				"%";
			document.getElementById("smSensor5").style.width = `${parseFloat(
				messageData.IotData.smSensor5
			).toFixed(2)}%`;

			if (parseFloat(messageData.IotData.smSensor5).toFixed(2) <= 60) {
				document.getElementById("smSensor5").style.background = "red";
			} else {
				document.getElementById("smSensor5").style.background = "green";
			}

			//SM6
			document.getElementById("smSensor6").innerHTML =
				" Soil Moisture Sensor #7: " +
				parseFloat(messageData.IotData.smSensor6).toFixed(2) +
				"%";
			document.getElementById("smSensor6").style.width = `${parseFloat(
				messageData.IotData.smSensor6
			).toFixed(2)}%`;

			if (parseFloat(messageData.IotData.smSensor6).toFixed(2) <= 60) {
				document.getElementById("smSensor6").style.background = "red";
			} else {
				document.getElementById("smSensor6").style.background = "green";
			}

			//SM7
			document.getElementById("smSensor7").innerHTML =
				" Soil Moisture Sensor #8: " +
				parseFloat(messageData.IotData.smSensor7).toFixed(2) +
				"%";
			document.getElementById("smSensor7").style.width = `${parseFloat(
				messageData.IotData.smSensor7
			).toFixed(2)}%`;

			if (parseFloat(messageData.IotData.smSensor7).toFixed(2) <= 60) {
				document.getElementById("smSensor7").style.background = "red";
			} else {
				document.getElementById("smSensor7").style.background = "green";
			}
		} catch (err) {
			console.error(err);
		}
	};
});
