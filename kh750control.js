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

var targetIP = [];
var client = [];
var xid = [1,1];
var muted = false;
var topsonly = false;
var subonly = false;
var dimmed = false;
var bmBypass = false;
var volume = 40.0;
const expectedWooferCount = 2;
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

var disableBM1 = '{"audio":{"out1":{"mixer":{"levels":[0.0,-100.0]}}},"osc":{"xid":'
var disableBM2 = '{"audio":{"out1":{"eq1":{"in1":{"enabled":[false,false]}}}},"osc":{"xid":'
var disableBM3 = '{"audio":{"out1":{"eq1":{"in2":{"enabled":[false,false]}}}},"osc":{"xid":'
var disableBM4 = '{"audio":{"out1":{"eq2":{"enabled":[false,false,false,false,false,false,false,false,false,false]}}},"osc":{"xid":'
var disableBM5 = '{"audio":{"out2":{"mixer":{"levels":[-100.0,0.0]}}},"osc":{"xid":'
var disableBM6 = '{"audio":{"out2":{"eq1":{"in1":{"enabled":[false,false]}}}},"osc":{"xid":'
var disableBM7 = '{"audio":{"out2":{"eq1":{"in2":{"enabled":[false,false]}}}},"osc":{"xid":'
var disableBM8 = '{"audio":{"out2":{"eq2":{"enabled":[false,false,false,false,false,false,false,false,false,false]}}},"osc":{"xid":'
var disableBM9 = '{"audio":{"out5":{"mixer":{"levels":[-100.0,-100.0]}}},"osc":{"xid":'
var disableBM10 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[false,false]}}}},"osc":{"xid":'
var disableBM11 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[false,false]}}}},"osc":{"xid":'

var enableBM1 = '{"audio":{"out1":{"eq1":{"in1":{"q":[0.707,0.707]}}}},"osc":{"xid":'
var enableBM2 = '{"audio":{"out1":{"eq1":{"in1":{"frequency":[80.0,80.0]}}}},"osc":{"xid":'
var enableBM3 = '{"audio":{"out1":{"eq1":{"in1":{"gain":[0.0,0.0]}}}},"osc":{"xid":'
var enableBM4 = '{"audio":{"out1":{"eq1":{"in1":{"type":["HIGHPASS","HIGHPASS"]}}}},"osc":{"xid":'
var enableBM5 = '{"audio":{"out1":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var enableBM6 = '{"audio":{"out1":{"eq1":{"in2":{"q":[0.707,0.707]}}}},"osc":{"xid":'
var enableBM7 = '{"audio":{"out1":{"eq1":{"in2":{"frequency":[80.0,80.0]}}}},"osc":{"xid":'
var enableBM8 = '{"audio":{"out1":{"eq1":{"in2":{"gain":[0.0,0.0]}}}},"osc":{"xid":'
var enableBM9 = '{"audio":{"out1":{"eq1":{"in2":{"type":["HIGHPASS","HIGHPASS"]}}}},"osc":{"xid":'
var enableBM10 = '{"audio":{"out1":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var enableBM11 = '{"audio":{"out1":{"eq2":{"enabled":[false,false,false,false,false,false,false,false,false,false]}}},"osc":{"xid":'
var enableBM12 = '{"audio":{"out2":{"eq1":{"in1":{"q":[0.707,0.707]}}}},"osc":{"xid":'
var enableBM13 = '{"audio":{"out2":{"eq1":{"in1":{"frequency":[80.0,80.0]}}}},"osc":{"xid":'
var enableBM14 = '{"audio":{"out2":{"eq1":{"in1":{"gain":[0.0,0.0]}}}},"osc":{"xid":'
var enableBM15 = '{"audio":{"out2":{"eq1":{"in1":{"type":["HIGHPASS","HIGHPASS"]}}}},"osc":{"xid":'
var enableBM16 = '{"audio":{"out2":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var enableBM17 = '{"audio":{"out2":{"eq1":{"in2":{"q":[0.707,0.707]}}}},"osc":{"xid":'
var enableBM18 = '{"audio":{"out2":{"eq1":{"in2":{"frequency":[80.0,80.0]}}}},"osc":{"xid":'
var enableBM19 = '{"audio":{"out2":{"eq1":{"in2":{"gain":[0.0,0.0]}}}},"osc":{"xid":'
var enableBM20 = '{"audio":{"out2":{"eq1":{"in2":{"type":["HIGHPASS","HIGHPASS"]}}}},"osc":{"xid":'
var enableBM21 = '{"audio":{"out2":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'
var enableBM22 = '{"audio":{"out2":{"eq2":{"enabled":[false,false,false,false,false,false,false,false,false,false]}}},"osc":{"xid":'
var enableBM23 = '{"audio":{"out5":{"mixer":{"levels":[0.0,0.0]}}},"osc":{"xid":'
var enableBM24 = '{"audio":{"out5":{"eq1":{"in1":{"enabled":[true,true]}}}},"osc":{"xid":'
var enableBM25 = '{"audio":{"out5":{"eq1":{"in2":{"enabled":[true,true]}}}},"osc":{"xid":'

function mute() 
{
  if (!muted)
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(muteall1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall3+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall4+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall5+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall6+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall7+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall8+xid[index]+endsequence);
      xid[index]++;
      client[index].send(muteall9+xid[index]+endsequence);
      xid[index]++;
    })
    muted = true;
  }
  else{
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(unmuteall1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall3+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall4+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall5+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall6+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall7+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall8+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmuteall9+xid[index]+endsequence);
      xid[index]++;
    })
    muted = false;
  }    
}

function dim()
{
  if (!dimmed)
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(dimm+xid[index]+endsequence);
      xid[index]++;
      dimmed = true;
    })
  }
  else
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(undimm+xid[index]+endsequence);
      xid[index]++;
      dimmed = false;
    })
  }    
}

function mutesub()
{
  if (!subonly)
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(mutesub1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(mutesub2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(mutesub3+xid[index]+endsequence);
      xid[index]++;
    })
    subonly = true;
  }
  else
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(unmutesub1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmutesub2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmutesub3+xid[index]+endsequence);
      xid[index]++;
    })
    subonly = false;
  }    
}

function mutetops()
{
  if (!topsonly)
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(mutetops1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(mutetops2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(mutetops3+xid[index]+endsequence);
      xid[index]++;
      client[index].send(mutetops4+xid[index]+endsequence);
      xid[index]++;
      client[index].send(mutetops5+xid[index]+endsequence);
      xid[index]++;
      client[index].send(mutetops6+xid[index]+endsequence);
      xid[index]++;
    })
    topsonly = true;
  }
  else
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(unmutetops1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmutetops2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmutetops3+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmutetops4+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmutetops5+xid[index]+endsequence);
      xid[index]++;
      client[index].send(unmutetops6+xid[index]+endsequence);
      xid[index]++;
    })
    topsonly = false;
  } 
}

function bassmanagement()
{
  if (!bmBypass)
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(disableBM1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM3+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM4+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM5+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM6+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM7+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM8+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM9+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM10+xid[index]+endsequence);
      xid[index]++;
      client[index].send(disableBM11+xid[index]+endsequence);
      xid[index]++;
    })
    bmBypass = true;
  }
  else
  {
    targetIP.forEach(function(item, index, array)
    {
      client[index].send(enableBM1+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM2+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM3+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM4+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM5+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM6+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM7+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM8+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM9+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM10+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM11+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM12+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM13+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM14+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM15+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM16+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM17+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM18+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM19+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM20+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM21+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM22+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM23+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM24+xid[index]+endsequence);
      xid[index]++;
      client[index].send(enableBM25+xid[index]+endsequence);
      xid[index]++;
    })
    bmBypass = false;
  } 
}

function writeVolume()
{
  targetIP.forEach(function(item, index, array)
  {
    client[index].send(setlevel1+volume+setlevel2+xid[index]+endsequence);
    xid[index]++;
  })
  console.log('Volume: '+volume);
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
 // console.log('got a response packet:', response)
  // todo: some proper testing if the found device is actually a KH 750
  if (wooferCount === expectedWooferCount)
  {
    return;
  }
  if (typeof response.additionals[0] === 'undefined' || typeof response.additionals[0].data === 'undefined')
  {
    return;
  }
  var substr;
  var str = response.additionals[0].name;
  if (str.length > 5)
  {
    substr = str.substring(0, 5);
  }
  else
  {
    return;
  }
  if (substr !== 'KH750')
  {
    return;
  }
  targetIP.forEach(function(item, index, array)
  {
    if (response.additionals[0].data === item)
    {
      return;
    }
  })
  targetIP.push(response.additionals[0].data);
  console.log ('IPs',targetIP[0],targetIP[1])
  client.push(new Client(targetIP[targetIP.length - 1], 45));

  
  client[targetIP.length - 1].send('{"device":{"identity":{"product":null}},"osc":{"xid":'+xid[targetIP.length - 1]+'}}\r\n', (err) => {
    console.log('Error opening socket. '+err)
    process.exit(1);
  });
  xid[targetIP.length - 1]++;
  wooferCount++;

  if (wooferCount === expectedWooferCount)
  {
    writeVolume();
  }
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
  else if (data[4] === 1) // right button
  {
    bassmanagement();
  }

  controlVolume2(data[0]); // jog wheel

  if (data[0] === 0  && data[2] === 0 && data[3] === 0 && data[4] === 0) // data[1] always contains the current encoder data
  {
    setTimeout(displayNotification, 500);
  }
})
