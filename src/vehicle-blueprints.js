// Traced silhouette controls from the five supplied front/side/rear/top sheets.
// The sheets are illustrative, not CAD. Official dimensions in the reference
// README take priority. Coordinates: +Z forward, +Y up, metres.
export const BLUEPRINTS = {
 'model-s': {
  source:'tesla-model-s.png',wheelbase:2.960,frontOverhang:.961,radius:.355,bottom:.20,belt:.89,
  body:[[-2.5105,.81,.74],[-2.39,.93,.86],[-1.99,.985,.96],[-1.41,1,.95],[0,.995,.94],[1.30,.99,.91],[1.96,.97,.84],[2.39,.89,.71],[2.5105,.76,.64]],
  cabin:[[-1.99,.96,.82],[-.92,1.30,.71],[-.25,1.405,.74],[.49,1.365,.72],[1.43,.93,.83]],
  windows:[[-1.67,-.30],[ -.21,1.22]],glassRoof:true,spokes:10,cladding:false
 },
 'model-y': {
  source:'tesla-model-y-juniper.png',wheelbase:2.890,frontOverhang:.889,radius:.382,bottom:.24,belt:1.015,
  body:[[-2.395,.87,.99],[-2.28,.95,1.09],[-1.86,.985,1.12],[-1.39,1,1.085],[0,.985,1.035],[1.42,.99,.99],[1.98,.965,.89],[2.30,.89,.80],[2.395,.82,.78]],
  cabin:[[-1.98,1.09,.85],[-.93,1.52,.72],[-.28,1.599,.75],[.40,1.565,.73],[1.43,1.035,.84]],
  windows:[[-1.66,-.24],[-.16,1.23]],glassRoof:true,spokes:8,cladding:true
 },
 ev6: {
  source:'kia-ev6.png',wheelbase:2.900,frontOverhang:.8975,radius:.372,bottom:.22,belt:1.00,
  body:[[-2.3475,.82,.97],[-2.24,.93,1.04],[-1.86,.985,1.065],[-1.45,1,1.035],[0,.99,1.015],[1.37,.99,.98],[1.94,.955,.84],[2.26,.875,.76],[2.3475,.77,.73]],
  cabin:[[-1.92,1.06,.81],[-1.04,1.455,.72],[-.20,1.525,.74],[.50,1.485,.72],[1.33,1.015,.82]],
  windows:[[-1.66,-.26],[-.18,1.14]],glassRoof:false,spokes:5,cladding:true
 },
 ev3: {
  source:'kia-ev3.png',wheelbase:2.680,frontOverhang:.810,radius:.355,bottom:.245,belt:1.04,
  body:[[-2.15,.89,1.035],[-2.02,.97,1.115],[-1.64,1,1.085],[-1.34,1,1.035],[0,.98,1.025],[1.34,1,.97],[1.86,.975,.91],[2.10,.89,.86],[2.15,.86,.82]],
  cabin:[[-1.99,1.13,.82],[-1.43,1.485,.73],[-.64,1.535,.74],[.40,1.515,.72],[1.29,1.005,.82]],
  windows:[[-1.68,-.29],[-.18,1.11]],glassRoof:false,spokes:4,cladding:true,boxy:true
 },
 cybertruck: {
  source:'tesla-cybertruck.png',wheelbase:3.635,frontOverhang:.878,radius:.47,bottom:.32,belt:1.10,
  body:[[-2.8415,.96,1.22],[-2.70,1,1.26],[-1.672,1,1.32],[-.90,1,1.43],[.34,1,1.17],[1.96,1,1.055],[2.68,.95,1.00],[2.8415,.90,.97]],
  cabin:[[-.92,1.43,.94],[-.85,1.58,.84],[.34,1.769,.86],[1.97,1.055,.94]],
  windows:[[-.70,.22],[.31,1.78]],glassRoof:false,spokes:7,cladding:true,angular:true
 },
 ioniq5: {
  source:null,wheelbase:3,frontOverhang:.82,radius:.37,bottom:.23,belt:1.02,
  body:[[-2.32,.87,.94],[-2.20,.96,1.04],[-1.62,1,1.065],[0,1,1.03],[1.50,1,1.00],[2.12,.95,.90],[2.32,.82,.86]],
  cabin:[[-1.96,1.065,.85],[-1.21,1.53,.76],[-.35,1.585,.78],[.55,1.56,.76],[1.41,1.035,.86]],
  windows:[[-1.74,-.23],[-.14,1.23]],glassRoof:false,spokes:5,cladding:true,boxy:true
 }
};
