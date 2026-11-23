export const STORY = {
  intro: {
    speaker: 'CONTROL / AINO',
    line: 'Maintenance, do you copy? Sector 09 is reporting a fault in the cooling relay. Pick up a security card from the guard station. Keep this routine. I will talk you through it.'
  },
  warning: {
    speaker: 'DR. LEHTO / RECORDED MESSAGE',
    line: 'If this recording is playing, the experiment has already started. Do not trust Control. Find the blue coolant coil and stay away from the containment tank.'
  },
  card: {
    speaker: 'CONTROL / AINO',
    line: 'Identity confirmed. The service door is opening. Wait... There should be nobody in that sector, but the motion sensors are showing two contacts.'
  },
  breach: {
    speaker: 'FACILITY ANNOUNCEMENT',
    line: 'Warning. Pressure differential in the test chamber has exceeded safe operating limits. All personnel must evacuate immediately. This is not a drill.'
  },
  coil: {
    speaker: 'DR. LEHTO / RECORDED MESSAGE',
    line: 'It follows sound. If you hear footsteps, keep moving. The backup generator is beside the reactor. The lift should take you to the lower service level.'
  },
  power: {
    speaker: 'CONTROL / AINO',
    line: 'Power is back. The maintenance lift is online. I cannot release the outer doors from here. There is an old service tram on the freight level. It should still run.'
  },
  liftStart: {
    speaker: 'AINO / RADIO',
    line: 'The lift is moving. I can hear something inside the shaft. When the doors open, head straight for the freight hall. Find a replacement fuse and restart the coolant pumps.'
  },
  freightArrival: {
    speaker: 'AINO / RADIO',
    line: 'You are on the freight level. This place was sealed years ago. The fuse cabinet is across the loading bay. Do not touch the red valves until the pumps are running.'
  },
  fuseFound: {
    speaker: 'AINO / RADIO',
    line: 'Good. The fuse looks intact. The pump station is at the far end of the hall, between the two pressure tanks. I will try to keep the lights on.'
  },
  pumpStarted: {
    speaker: 'DR. LEHTO? / RADIO',
    line: 'Do not start the pumps. That is not coolant in the pipes. It is... Listen. It has learned how to use the radio.'
  },
  valveClosed: {
    speaker: 'AINO / RADIO',
    line: 'Pressure is dropping. The service route is clear. The tram controls are on the platform. Once you start it, do not wait around.'
  },
  pistolFound: {
    speaker: 'AINO / RADIO',
    line: 'You found the guard’s sidearm. Keep it ready. There is nobody left down there who can help you.'
  },
  shaftLog: {
    speaker: 'NIGHT MAINTENANCE / RECORDING',
    line: 'The lift has been out of service for three years. Someone called it from below tonight. Lehto told us to leave before the doors opened. He stayed behind in the test chamber.'
  },
  freightLog: {
    speaker: 'FREIGHT TECHNICIAN / RECORDING',
    line: 'The freight bay was sealed before the experiment. Someone moved all the samples down here, but the transfer manifest has no recipient. Do not take anything onto the tram.'
  },
  tramStarted: {
    speaker: 'UNKNOWN TRANSMISSION',
    line: 'You are not the first to try to leave. But you are the first to open the door from the right side.'
  },
  ending: {
    speaker: 'AINO / RADIO',
    line: 'I can see the tram signal. It is moving. I do not know where that track leads, but stay on board. I will find another way out.'
  }
};

export const OBJECTIVES = [
  ['Find the security keycard', 'Take it from the guard station.'],
  ['Unlock the service door', 'Use the card reader.'],
  ['Retrieve the coolant coil', 'Search the test chamber maintenance level.'],
  ['Restore backup power', 'Activate the generator beside the reactor.'],
  ['Call the maintenance lift', 'Use the lift control panel.'],
  ['Reach the freight level', 'Leave the lift and enter the freight hall.'],
  ['Find a replacement fuse', 'Search the loading bay tool cabinet.'],
  ['Restart the coolant pumps', 'Install the fuse at the pump control panel.'],
  ['Close the pressure valve', 'Turn the manual valve in the pump gallery.'],
  ['Start the service tram', 'Use the platform control panel.'],
  ['Escape through the service tunnel', 'Stay aboard the tram.']
];
