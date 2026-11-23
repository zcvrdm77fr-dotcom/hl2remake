export const STORY = {
  intro: {
    speaker: 'AINO / VALVOMO',
    line: 'Huoltoteknikko, kuuletko? Sektorissa 09 on häiriö jäähdytysreleessä. Käy hakemassa kulkukortti vartijan kopista. Pidetään tämä tavallisena huoltokeikkana.'
  },
  warning: {
    speaker: 'DR. LEHTO / TALLENNE',
    line: 'Jos tämä tallenne käynnistyi, koe on jo alkanut. Älä luota valvomoon. Hae sininen jäähdytyskela ja pysy poissa säiliön läheltä.'
  },
  card: {
    speaker: 'AINO / VALVOMO',
    line: 'Tunniste hyväksytty. Huolto-ovi avautuu. Odota... Sektorissa ei pitäisi olla ketään, mutta liiketunnistin näyttää kaksi kohdetta.'
  },
  breach: {
    speaker: 'KUULUTUS',
    line: 'Varoitus. Koealueen paine-ero ylittää turvallisen rajan. Kaikki työntekijät evakuoitava välittömästi. Tämä ei ole harjoitus.'
  },
  coil: {
    speaker: 'DR. LEHTO / TALLENNE',
    line: 'Se seuraa ääntä. Jos kuulet askeleet, älä jää paikallesi. Varavoima on reaktorin oikealla puolella. Hissin pitäisi viedä sinut alemmalle huoltotasolle.'
  },
  power: {
    speaker: 'AINO / VALVOMO',
    line: 'Virta palautui. Hissi on nyt käytettävissä. En saa ulko-ovia auki täältä käsin. Alemmalla tasolla on vanha huoltoraitiovaunu. Sen pitäisi kulkea vielä.'
  },
  liftStart: {
    speaker: 'AINO / RADIO',
    line: 'Hissi liikkuu. Kuulen jotain kuilussa. Kun ovet aukeavat, jatka suoraan rahtihalliin. Etsi varasulake ja käynnistä jäähdytyspumput.'
  },
  freightArrival: {
    speaker: 'AINO / RADIO',
    line: 'Olet rahtitasolla. Tämä paikka suljettiin vuosia sitten. Sulakekaappi on lastauslaiturin toisella puolella. Älä koske punaisiin venttiileihin ennen kuin pumput ovat käynnissä.'
  },
  fuseFound: {
    speaker: 'AINO / RADIO',
    line: 'Hyvä. Sulake näyttää ehjältä. Pumppukeskus on hallin perällä, kahden paineastian välissä. Yritän pitää valot päällä.'
  },
  pumpStarted: {
    speaker: 'DR. LEHTO / RADIO?',
    line: 'Älä käynnistä pumppuja. Se ei ole jäähdytysnestettä putkissa. Se on... Kuuntele. Se osaa käyttää radiota.'
  },
  valveClosed: {
    speaker: 'AINO / RADIO',
    line: 'Paine laskee. Saimme kulkuväylän auki. Raitiovaunun ohjauspaneeli on laiturilla. Kun käynnistät sen, älä jää odottamaan.'
  },
  tramStarted: {
    speaker: 'TUNTEMATON',
    line: 'Sinä et ole ensimmäinen, joka yrittää lähteä. Mutta olet ensimmäinen, joka avasi oven oikealta puolelta.'
  },
  ending: {
    speaker: 'AINO / RADIO',
    line: 'Näen raitiovaunun signaalin. Se liikkuu. En tiedä minne raide vie, mutta pysy kyydissä. Minä etsin toisen reitin.'
  }
};

export const OBJECTIVES = [
  ['Etsi kulkukortti', 'Vartijan kopista.'],
  ['Avaa huolto-ovi', 'Käytä korttia lukijaan.'],
  ['Hae jäähdytyskela', 'Testikammion huoltotasolta.'],
  ['Palauta varavoima', 'Käynnistä reaktorin vieressä oleva konsoli.'],
  ['Kutsu huoltohissi', 'Käytä hissin ohjauspaneelia.'],
  ['Saavu rahtitasolle', 'Poistu hissistä ja etsi reitti rahtihalliin.'],
  ['Etsi varasulake', 'Tutki lastauslaiturin työkalukaappi.'],
  ['Käynnistä jäähdytyspumput', 'Asenna sulake pumppukeskuksen konsoliin.'],
  ['Sulje paineventtiili', 'Käännä käsiventtiili pumppugalleriassa.'],
  ['Käynnistä huoltoraitiovaunu', 'Mene laiturin ohjauspaneelille.']
];
