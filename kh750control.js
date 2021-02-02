const { Client, Server } = require('node-osc');
const readline = require('readline');
var HID = require('node-hid');
const WindowsToaster = require('node-notifier').WindowsToaster;
var notifier = new WindowsToaster({
  withFallback: false,
  customPath: undefined,
});
var mdns = require('multicast-dns')(
{
  multicast: true, // use udp multicasting
  port: 5353, // set the udp port
  ip: 'ff02::fb', // set the udp ip
  ttl: 255, // set the multicast ttl
  loopback: true, // receive your own packets
  reuseAddr: true,
  interface: 'fe80::5810:5590:b0b4:5604%6', // TODO automatic detection // network interface IPv6 address exactly as given by "ipconfig" (including %)

  type: 'udp6'
})

// var server = new Server(64113, '::'); // Don't want to listen right now
// server.on('listening', () => {
//   console.log('OSC Server is listening.');
// })

// server.on('message', (msg) => {
//   console.log(`Message: ${msg}`);
//   server.close();
// });

var targetIP;
var client;
var xid = 1;
var muted = false;
var topsonly = false;
var subonly = false;
var dimmed = false;
var volume = 50.0;
const expectedWooferCount = 1; // Todo: 2
const maxVolume = 99.0;  // there are more steps, but the woofer will switch to another reference level which is annoying

var endsequence = '}}\r\n'

var dimm = '{"audio":{"out":{"dimm":-20.0}},"osc":{"xid":'

var undimm = '{"audio":{"out":{"dimm":0.0}},"osc":{"xid":'

var setlevel1 = '{"audio":{"out":{"level":' // add value in form of xx.x, eg 50.0
var setlevel2 = '}},"osc":{"xid":'

var muteall1 = '{"audio":{"out1":{"mixer":{"levels":[-100.0,-100.0]}}},"osc":{"xid":'
var muteall2 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var muteall3 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var muteall4 = '{"audio":{"out2":{"mixer":{"levels":[-100.0,-100.0]}}},"osc":{"xid":'
var muteall5 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var muteall6 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var muteall7 = '{"audio":{"out5":{"mixer":{"levels":[-100.0,-100.0]}}},"osc":{"xid":'
var muteall8 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var muteall9 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'

var unmuteall1 = '{"audio":{"out1":{"mixer":{"levels":[0.0,-100.0]}}},"osc":{"xid":'
var unmuteall2 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmuteall3 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmuteall4 = '{"audio":{"out2":{"mixer":{"levels":[-100.0,0.0]}}},"osc":{"xid":'
var unmuteall5 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmuteall6 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmuteall7 = '{"audio":{"out5":{"mixer":{"levels":[0.0,0.0]}}},"osc":{"xid":'
var unmuteall8 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmuteall9 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'

var mutetops1 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var mutetops2 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var mutetops3 = '{"audio":{"out1":{"mixer":{"levels":[-100.0,-100.0]}}},"osc":{"xid":'
var mutetops4 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var mutetops5 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var mutetops6 = '{"audio":{"out2":{"mixer":{"levels":[-100.0,-100.0]}}},"osc":{"xid":'

var unmutetops1 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmutetops2 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmutetops3 = '{"audio":{"out1":{"mixer":{"levels":[0.0,-100.0]}}},"osc":{"xid":'
var unmutetops4 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmutetops5 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmutetops6 = '{"audio":{"out2":{"mixer":{"levels":[-100.0,0.0]}}},"osc":{"xid":'

var mutesub1 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var mutesub2 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var mutesub3 = '{"audio":{"out5":{"mixer":{"levels":[-100.0,-100.0]}}},"osc":{"xid":' 

var unmutesub1 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmutesub2 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var unmutesub3 = '{"audio":{"out5":{"mixer":{"levels":[0.0,0.0]}}},"osc":{"xid":' 

function mute() 
{
  if (!muted)
  {
    client.send(muteall1+xid+endsequence);
    xid++;
    client.send(muteall2+xid+endsequence);
    xid++;
    client.send(muteall3+xid+endsequence);
    xid++;
    client.send(muteall4+xid+endsequence);
    xid++;
    client.send(muteall5+xid+endsequence);
    xid++;
    client.send(muteall6+xid+endsequence);
    xid++;
    client.send(muteall7+xid+endsequence);
    xid++;
    client.send(muteall8+xid+endsequence);
    xid++;
    client.send(muteall9+xid+endsequence);
    xid++;
    muted = true;
  }
  else{
    client.send(unmuteall1+xid+endsequence);
    xid++;
    client.send(unmuteall2+xid+endsequence);
    xid++;
    client.send(unmuteall3+xid+endsequence);
    xid++;
    client.send(unmuteall4+xid+endsequence);
    xid++;
    client.send(unmuteall5+xid+endsequence);
    xid++;
    client.send(unmuteall6+xid+endsequence);
    xid++;
    client.send(unmuteall7+xid+endsequence);
    xid++;
    client.send(unmuteall8+xid+endsequence);
    xid++;
    client.send(unmuteall9+xid+endsequence);
    xid++;
    muted = false;
  }    
}

function dim()
{
  if (!dimmed)
  {
    client.send(dimm+xid+endsequence);
    xid++;
    dimmed = true;
  }
  else{
    client.send(undimm+xid+endsequence);
    xid++;
    dimmed = false;
  }    
}

function mutesub()
{
  if (!subonly)
  {
    client.send(mutesub1+xid+endsequence);
    xid++;
    client.send(mutesub2+xid+endsequence);
    xid++;
    client.send(mutesub3+xid+endsequence);
    xid++;
    subonly = true;
  }
  else{
    client.send(unmutesub1+xid+endsequence);
    xid++;
    client.send(unmutesub2+xid+endsequence);
    xid++;
    client.send(unmutesub3+xid+endsequence);
    xid++;
    subonly = false;
  }    
}

function mutetops()
{
  if (!topsonly)
  {
    client.send(mutetops1+xid+endsequence);
    xid++;
    client.send(mutetops2+xid+endsequence);
    xid++;
    client.send(mutetops3+xid+endsequence);
    xid++;
    client.send(mutetops4+xid+endsequence);
    xid++;
    client.send(mutetops5+xid+endsequence);
    xid++;
    client.send(mutetops6+xid+endsequence);
    xid++;
    topsonly = true;
  }
  else{
    client.send(unmutetops1+xid+endsequence);
    xid++;
    client.send(unmutetops2+xid+endsequence);
    xid++;
    client.send(unmutetops3+xid+endsequence);
    xid++;
    client.send(unmutetops4+xid+endsequence);
    xid++;
    client.send(unmutetops5+xid+endsequence);
    xid++;
    client.send(unmutetops6+xid+endsequence);
    xid++;
    topsonly = false;
  } 
}

function writeVolume()
{
  console.log('Volume: '+volume);
  client.send(setlevel1+volume+setlevel2+xid+endsequence);
  xid++;
}

var oldControllerValue = 1000;
function controlVolume(controllerValue) // rotary encoder volume control
{
  if (oldControllerValue === 1000)
  {
    oldControllerValue = controllerValue;
  }
  else
  {
    if (oldControllerValue === 255 && controllerValue === 0)
    {
      volume += 1;
    }
    else if (oldControllerValue === 0 && controllerValue === 255)
    {
      volume -= 1;
    }
    else if (oldControllerValue < controllerValue)
    {
      volume += 1;
    }
    else if (oldControllerValue > controllerValue)
    {
      volume -= 1;
    }
    oldControllerValue = controllerValue;
    // else volume remained the same
  }

  if (volume < 0)
  {
    volume = 0;
  }
  if (volume > maxVolume)
  {
    volume = maxVolume;
  }
  writeVolume();
}

var volumeModifier = 0.0;
function controlVolume2(controllerValue) // jog wheel volume control
{
  if (controllerValue === 1 || controllerValue === 255)
  {
    volumeModifier = 0.5;
  }
  else if (controllerValue === 2 || controllerValue === 254)
  {
    volumeModifier = 1;
  }
  else if (controllerValue === 3 || controllerValue === 253)
  {
    volumeModifier = 1.5;
  }
  else if (controllerValue === 4 || controllerValue === 252)
  {
    volumeModifier = 2;
  }
  else if (controllerValue === 5 || controllerValue === 251)
  {
    volumeModifier = 2.5;
  }
  else if (controllerValue === 6 || controllerValue === 250)
  {
    volumeModifier = 3;
  }
  else if (controllerValue === 7 || controllerValue === 249)
  {
    volumeModifier = 5;
  }
  else
  {
    volumeModifier = 0;
  }

  if (controllerValue > 7)
  {
    volumeModifier = -volumeModifier;
  }
}

var oldVolume = 1000;
function timeout(arg) // jog wheel volume control
{
  if (oldVolume !== volume)
  {
    oldVolume = volume;
  }

  volume += volumeModifier;

  if (volume < 0)
  {
    volume = 0;
  }
  if (volume > maxVolume)
  {
    volume = maxVolume; 
  }
  if (volume !== oldVolume)
  {
    writeVolume();
  }

  setTimeout(timeout, 100);
}
setTimeout(timeout, 100);
 
var wooferCount = 0;
mdns.on('response', function(response) {
  // todo: some proper testing if the found device is actually a KH 750
  if (wooferCount === expectedWooferCount)
  {
    return;
  }
  //console.log('got a response packet:', response)
  if (typeof response.additionals[0] === 'undefined' || typeof response.additionals[0].data === 'undefined')
  {
    return;
  }
  targetIP = response.additionals[0].data;
  console.log ('ip',targetIP)
  client = new Client(targetIP, 45);

  
  client.send('{"device":{"identity":{"product":null}},"osc":{"xid":'+xid+'}}\r\n', (err) => {
    if (err) console.error(err);
    client.close();
  });
  xid++;
  writeVolume();
  wooferCount++;
})
 
// mdns.on('query', function(query) {
//  // console.log('got a query packet:', query)
// })
 
// query for every device supporting Sennheiser Sound Control (SSC)
mdns.query({
  questions:[{
    name: '_ssc._tcp.local',
    type: 'PTR'
  }]
})

function displayNotification(arg)
{
  notifier.notify(
    {
      title: 'Neumann KH 750 DSP',
      message: 'Volume: '+volume.toString(),
      sound: false,
      // id: toastid,
      remove: undefined, // doesn't work :(
      install: undefined
    });
}

var usbdev = new HID.HID(2867,32); // Contour ShuttleXpress

usbdev.on("data", function(data) {
  //console.log(data);

  controlVolume(data[1]); // rotary encoder

  if (data[3] === 16) // left button
  {
    mute();
  }
  else if (data[3] === 32) // second to left button
  {
    dim();
  }
  else if (data[3] === 64) // middle button
  {
    mutesub();
  }  
  else if (data[3] === 128) // second to right button
  {
    mutetops();
  }

  controlVolume2(data[0]); // jog wheel

  if (data[0] === 0  && data[2] === 0 && data[3] === 0 && data[4] === 0) // data[1] always contains the current encoder data
  {
    setTimeout(displayNotification, 500);
  }
})
