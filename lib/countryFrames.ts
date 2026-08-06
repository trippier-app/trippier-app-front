/**
 * Where to put the camera for each country, and the English name to fall
 * back on.
 *
 * The fills come from MapTiler vector tiles, whose geometry arrives clipped
 * to each tile — enough to paint a country, never enough to measure one. So
 * the boxes are precomputed here, from Natural Earth, and serve only to aim
 * the camera.
 *
 * A country whose parts straddle the date line is framed on its largest
 * part: a box around every part would span the planet.
 */
export interface CountryFrame {
  name: string;
  /** South-west then north-east corner. */
  bounds: [[number, number], [number, number]];
}

export const COUNTRY_FRAMES: Record<string, CountryFrame> = {
  AE: {
    name: 'United Arab Emirates',
    bounds: [
      [51.58, 22.5],
      [56.4, 26.06],
    ],
  },
  AF: {
    name: 'Afghanistan',
    bounds: [
      [60.53, 29.32],
      [75.16, 38.49],
    ],
  },
  AL: {
    name: 'Albania',
    bounds: [
      [19.3, 39.62],
      [21.02, 42.69],
    ],
  },
  AM: {
    name: 'Armenia',
    bounds: [
      [43.58, 38.74],
      [46.51, 41.25],
    ],
  },
  AO: {
    name: 'Angola',
    bounds: [
      [11.64, -17.93],
      [24.08, -5.86],
    ],
  },
  AR: {
    name: 'Argentina',
    bounds: [
      [-73.42, -52.35],
      [-53.63, -21.83],
    ],
  },
  AT: {
    name: 'Austria',
    bounds: [
      [9.48, 46.43],
      [16.98, 49.04],
    ],
  },
  AU: {
    name: 'Australia',
    bounds: [
      [113.34, -39.04],
      [153.57, -10.67],
    ],
  },
  AZ: {
    name: 'Azerbaijan',
    bounds: [
      [44.97, 38.27],
      [50.39, 41.86],
    ],
  },
  BA: {
    name: 'Bosnia and Herz.',
    bounds: [
      [15.75, 42.65],
      [19.6, 45.23],
    ],
  },
  BD: {
    name: 'Bangladesh',
    bounds: [
      [88.08, 20.67],
      [92.67, 26.45],
    ],
  },
  BE: {
    name: 'Belgium',
    bounds: [
      [2.51, 49.53],
      [6.16, 51.48],
    ],
  },
  BF: {
    name: 'Burkina Faso',
    bounds: [
      [-5.47, 9.61],
      [2.18, 15.12],
    ],
  },
  BG: {
    name: 'Bulgaria',
    bounds: [
      [22.38, 41.23],
      [28.56, 44.23],
    ],
  },
  BI: {
    name: 'Burundi',
    bounds: [
      [29.02, -4.5],
      [30.75, -2.35],
    ],
  },
  BJ: {
    name: 'Benin',
    bounds: [
      [0.77, 6.14],
      [3.8, 12.24],
    ],
  },
  BN: {
    name: 'Brunei',
    bounds: [
      [114.2, 4.01],
      [115.45, 5.45],
    ],
  },
  BO: {
    name: 'Bolivia',
    bounds: [
      [-69.59, -22.87],
      [-57.5, -9.76],
    ],
  },
  BR: {
    name: 'Brazil',
    bounds: [
      [-73.99, -33.77],
      [-34.73, 5.24],
    ],
  },
  BS: {
    name: 'Bahamas',
    bounds: [
      [-78.41, 23.71],
      [-77.53, 25.21],
    ],
  },
  BT: {
    name: 'Bhutan',
    bounds: [
      [88.81, 26.72],
      [92.1, 28.3],
    ],
  },
  BW: {
    name: 'Botswana',
    bounds: [
      [19.9, -26.83],
      [29.43, -17.66],
    ],
  },
  BY: {
    name: 'Belarus',
    bounds: [
      [23.2, 51.32],
      [32.69, 56.17],
    ],
  },
  BZ: {
    name: 'Belize',
    bounds: [
      [-89.23, 15.89],
      [-88.11, 18.5],
    ],
  },
  CA: {
    name: 'Canada',
    bounds: [
      [-141.0, 41.68],
      [-55.68, 71.92],
    ],
  },
  CD: {
    name: 'Dem. Rep. Congo',
    bounds: [
      [12.18, -13.26],
      [31.17, 5.26],
    ],
  },
  CF: {
    name: 'Central African Rep.',
    bounds: [
      [14.46, 2.27],
      [27.37, 11.14],
    ],
  },
  CG: {
    name: 'Congo',
    bounds: [
      [11.09, -5.04],
      [18.45, 3.73],
    ],
  },
  CH: {
    name: 'Switzerland',
    bounds: [
      [6.02, 45.78],
      [10.44, 47.83],
    ],
  },
  CI: {
    name: "Côte d'Ivoire",
    bounds: [
      [-8.6, 4.34],
      [-2.56, 10.52],
    ],
  },
  CL: {
    name: 'Chile',
    bounds: [
      [-75.64, -53.86],
      [-66.99, -17.58],
    ],
  },
  CM: {
    name: 'Cameroon',
    bounds: [
      [8.49, 1.73],
      [16.01, 12.86],
    ],
  },
  CN: {
    name: 'China',
    bounds: [
      [73.68, 20.28],
      [135.03, 53.46],
    ],
  },
  CO: {
    name: 'Colombia',
    bounds: [
      [-78.99, -4.3],
      [-66.88, 12.44],
    ],
  },
  CR: {
    name: 'Costa Rica',
    bounds: [
      [-85.94, 8.23],
      [-82.55, 11.22],
    ],
  },
  CU: {
    name: 'Cuba',
    bounds: [
      [-84.97, 19.86],
      [-74.18, 23.19],
    ],
  },
  CY: {
    name: 'Cyprus',
    bounds: [
      [32.26, 34.57],
      [34.0, 35.17],
    ],
  },
  CZ: {
    name: 'Czechia',
    bounds: [
      [12.24, 48.56],
      [18.85, 51.12],
    ],
  },
  DE: {
    name: 'Germany',
    bounds: [
      [5.99, 47.3],
      [15.02, 54.98],
    ],
  },
  DJ: {
    name: 'Djibouti',
    bounds: [
      [41.66, 10.93],
      [43.32, 12.7],
    ],
  },
  DK: {
    name: 'Denmark',
    bounds: [
      [8.09, 54.83],
      [10.91, 57.73],
    ],
  },
  DO: {
    name: 'Dominican Rep.',
    bounds: [
      [-71.95, 17.6],
      [-68.32, 19.88],
    ],
  },
  DZ: {
    name: 'Algeria',
    bounds: [
      [-8.68, 19.06],
      [12.0, 37.12],
    ],
  },
  EC: {
    name: 'Ecuador',
    bounds: [
      [-80.97, -4.96],
      [-75.23, 1.38],
    ],
  },
  EE: {
    name: 'Estonia',
    bounds: [
      [23.34, 57.47],
      [28.13, 59.61],
    ],
  },
  EG: {
    name: 'Egypt',
    bounds: [
      [24.7, 22],
      [36.87, 31.59],
    ],
  },
  EH: {
    name: 'W. Sahara',
    bounds: [
      [-17.06, 21.0],
      [-8.67, 27.66],
    ],
  },
  ER: {
    name: 'Eritrea',
    bounds: [
      [36.32, 12.46],
      [43.08, 18.0],
    ],
  },
  ES: {
    name: 'Spain',
    bounds: [
      [-9.39, 35.95],
      [3.04, 43.75],
    ],
  },
  ET: {
    name: 'Ethiopia',
    bounds: [
      [32.95, 3.42],
      [47.79, 14.96],
    ],
  },
  FI: {
    name: 'Finland',
    bounds: [
      [20.65, 59.85],
      [31.52, 70.16],
    ],
  },
  FJ: {
    name: 'Fiji',
    bounds: [
      [177.29, -18.29],
      [178.72, -17.34],
    ],
  },
  FK: {
    name: 'Falkland Is.',
    bounds: [
      [-61.2, -52.3],
      [-57.75, -51.1],
    ],
  },
  FR: {
    name: 'France',
    bounds: [
      [-4.59, 42.34],
      [8.1, 51.15],
    ],
  },
  GA: {
    name: 'Gabon',
    bounds: [
      [8.8, -3.98],
      [14.43, 2.33],
    ],
  },
  GB: {
    name: 'United Kingdom',
    bounds: [
      [-6.15, 49.96],
      [1.68, 58.63],
    ],
  },
  GE: {
    name: 'Georgia',
    bounds: [
      [39.96, 41.06],
      [46.64, 43.55],
    ],
  },
  GH: {
    name: 'Ghana',
    bounds: [
      [-3.24, 4.71],
      [1.06, 11.1],
    ],
  },
  GL: {
    name: 'Greenland',
    bounds: [
      [-73.3, 60.04],
      [-12.21, 83.65],
    ],
  },
  GM: {
    name: 'Gambia',
    bounds: [
      [-16.84, 13.13],
      [-13.84, 13.88],
    ],
  },
  GN: {
    name: 'Guinea',
    bounds: [
      [-15.13, 7.31],
      [-7.83, 12.59],
    ],
  },
  GQ: {
    name: 'Eq. Guinea',
    bounds: [
      [9.31, 1.01],
      [11.29, 2.28],
    ],
  },
  GR: {
    name: 'Greece',
    bounds: [
      [20.15, 36.41],
      [26.6, 41.83],
    ],
  },
  GT: {
    name: 'Guatemala',
    bounds: [
      [-92.23, 13.74],
      [-88.23, 17.82],
    ],
  },
  GW: {
    name: 'Guinea-Bissau',
    bounds: [
      [-16.68, 11.04],
      [-13.7, 12.63],
    ],
  },
  GY: {
    name: 'Guyana',
    bounds: [
      [-61.41, 1.27],
      [-56.54, 8.37],
    ],
  },
  HN: {
    name: 'Honduras',
    bounds: [
      [-89.35, 12.98],
      [-83.15, 16.01],
    ],
  },
  HR: {
    name: 'Croatia',
    bounds: [
      [13.66, 42.48],
      [19.39, 46.5],
    ],
  },
  HT: {
    name: 'Haiti',
    bounds: [
      [-74.46, 18.03],
      [-71.62, 19.92],
    ],
  },
  HU: {
    name: 'Hungary',
    bounds: [
      [16.2, 45.76],
      [22.71, 48.62],
    ],
  },
  ID: {
    name: 'Indonesia',
    bounds: [
      [95.29, -5.87],
      [106.11, 5.48],
    ],
  },
  IE: {
    name: 'Ireland',
    bounds: [
      [-9.98, 51.67],
      [-6.03, 55.13],
    ],
  },
  IL: {
    name: 'Israel',
    bounds: [
      [34.27, 29.5],
      [35.84, 33.28],
    ],
  },
  IN: {
    name: 'India',
    bounds: [
      [68.18, 7.97],
      [97.4, 35.49],
    ],
  },
  IQ: {
    name: 'Iraq',
    bounds: [
      [38.79, 29.1],
      [48.57, 37.39],
    ],
  },
  IR: {
    name: 'Iran',
    bounds: [
      [44.11, 25.08],
      [63.32, 39.71],
    ],
  },
  IS: {
    name: 'Iceland',
    bounds: [
      [-24.33, 63.5],
      [-13.61, 66.53],
    ],
  },
  IT: {
    name: 'Italy',
    bounds: [
      [6.75, 37.91],
      [18.48, 47.12],
    ],
  },
  JM: {
    name: 'Jamaica',
    bounds: [
      [-78.34, 17.7],
      [-76.2, 18.52],
    ],
  },
  JO: {
    name: 'Jordan',
    bounds: [
      [34.92, 29.2],
      [39.2, 33.38],
    ],
  },
  JP: {
    name: 'Japan',
    bounds: [
      [129.41, 31.03],
      [141.91, 41.38],
    ],
  },
  KE: {
    name: 'Kenya',
    bounds: [
      [33.89, -4.68],
      [41.86, 5.51],
    ],
  },
  KG: {
    name: 'Kyrgyzstan',
    bounds: [
      [69.46, 39.28],
      [80.26, 43.3],
    ],
  },
  KH: {
    name: 'Cambodia',
    bounds: [
      [102.35, 10.49],
      [107.61, 14.57],
    ],
  },
  KP: {
    name: 'North Korea',
    bounds: [
      [124.27, 37.67],
      [130.78, 42.99],
    ],
  },
  KR: {
    name: 'South Korea',
    bounds: [
      [126.12, 34.39],
      [129.47, 38.61],
    ],
  },
  KW: {
    name: 'Kuwait',
    bounds: [
      [46.57, 28.53],
      [48.42, 30.06],
    ],
  },
  KZ: {
    name: 'Kazakhstan',
    bounds: [
      [46.47, 40.66],
      [87.36, 55.39],
    ],
  },
  LA: {
    name: 'Laos',
    bounds: [
      [100.12, 13.88],
      [107.56, 22.46],
    ],
  },
  LB: {
    name: 'Lebanon',
    bounds: [
      [35.13, 33.09],
      [36.61, 34.64],
    ],
  },
  LK: {
    name: 'Sri Lanka',
    bounds: [
      [79.7, 5.97],
      [81.79, 9.82],
    ],
  },
  LR: {
    name: 'Liberia',
    bounds: [
      [-11.44, 4.36],
      [-7.54, 8.54],
    ],
  },
  LS: {
    name: 'Lesotho',
    bounds: [
      [27.0, -30.65],
      [29.33, -28.65],
    ],
  },
  LT: {
    name: 'Lithuania',
    bounds: [
      [21.06, 53.91],
      [26.59, 56.37],
    ],
  },
  LU: {
    name: 'Luxembourg',
    bounds: [
      [5.67, 49.44],
      [6.24, 50.13],
    ],
  },
  LV: {
    name: 'Latvia',
    bounds: [
      [21.06, 55.62],
      [28.18, 57.97],
    ],
  },
  LY: {
    name: 'Libya',
    bounds: [
      [9.32, 19.58],
      [25.16, 33.14],
    ],
  },
  MA: {
    name: 'Morocco',
    bounds: [
      [-17.02, 21.42],
      [-1.12, 35.76],
    ],
  },
  MD: {
    name: 'Moldova',
    bounds: [
      [26.62, 45.49],
      [30.02, 48.47],
    ],
  },
  ME: {
    name: 'Montenegro',
    bounds: [
      [18.45, 41.88],
      [20.34, 43.52],
    ],
  },
  MG: {
    name: 'Madagascar',
    bounds: [
      [43.25, -25.6],
      [50.48, -12.04],
    ],
  },
  MK: {
    name: 'North Macedonia',
    bounds: [
      [20.46, 40.84],
      [22.95, 42.32],
    ],
  },
  ML: {
    name: 'Mali',
    bounds: [
      [-12.17, 10.1],
      [4.27, 24.97],
    ],
  },
  MM: {
    name: 'Myanmar',
    bounds: [
      [92.3, 9.93],
      [101.18, 28.34],
    ],
  },
  MN: {
    name: 'Mongolia',
    bounds: [
      [87.75, 41.6],
      [119.77, 52.05],
    ],
  },
  MR: {
    name: 'Mauritania',
    bounds: [
      [-17.06, 14.62],
      [-4.92, 27.4],
    ],
  },
  MW: {
    name: 'Malawi',
    bounds: [
      [32.69, -16.8],
      [35.77, -9.23],
    ],
  },
  MX: {
    name: 'Mexico',
    bounds: [
      [-117.13, 14.54],
      [-86.81, 32.72],
    ],
  },
  MY: {
    name: 'Malaysia',
    bounds: [
      [109.66, 0.77],
      [119.18, 6.93],
    ],
  },
  MZ: {
    name: 'Mozambique',
    bounds: [
      [30.18, -26.74],
      [40.78, -10.32],
    ],
  },
  NA: {
    name: 'Namibia',
    bounds: [
      [11.73, -29.05],
      [25.08, -16.94],
    ],
  },
  NC: {
    name: 'New Caledonia',
    bounds: [
      [164.03, -22.4],
      [167.12, -20.11],
    ],
  },
  NE: {
    name: 'Niger',
    bounds: [
      [0.3, 11.66],
      [15.9, 23.47],
    ],
  },
  NG: {
    name: 'Nigeria',
    bounds: [
      [2.69, 4.24],
      [14.58, 13.87],
    ],
  },
  NI: {
    name: 'Nicaragua',
    bounds: [
      [-87.67, 10.73],
      [-83.15, 15.02],
    ],
  },
  NL: {
    name: 'Netherlands',
    bounds: [
      [3.31, 50.8],
      [7.09, 53.51],
    ],
  },
  NO: {
    name: 'Norway',
    bounds: [
      [4.99, 58.08],
      [31.29, 71.19],
    ],
  },
  NP: {
    name: 'Nepal',
    bounds: [
      [80.09, 26.4],
      [88.17, 30.42],
    ],
  },
  NZ: {
    name: 'New Zealand',
    bounds: [
      [166.51, -46.64],
      [174.25, -40.49],
    ],
  },
  OM: {
    name: 'Oman',
    bounds: [
      [52.0, 16.65],
      [59.81, 24.92],
    ],
  },
  PA: {
    name: 'Panama',
    bounds: [
      [-82.97, 7.22],
      [-77.24, 9.61],
    ],
  },
  PE: {
    name: 'Peru',
    bounds: [
      [-81.41, -18.35],
      [-68.67, -0.06],
    ],
  },
  PG: {
    name: 'Papua New Guinea',
    bounds: [
      [141.0, -10.65],
      [150.8, -2.6],
    ],
  },
  PH: {
    name: 'Philippines',
    bounds: [
      [119.88, 12.54],
      [124.18, 18.51],
    ],
  },
  PK: {
    name: 'Pakistan',
    bounds: [
      [60.87, 23.69],
      [77.84, 37.13],
    ],
  },
  PL: {
    name: 'Poland',
    bounds: [
      [14.07, 49.03],
      [24.03, 54.85],
    ],
  },
  PR: {
    name: 'Puerto Rico',
    bounds: [
      [-67.24, 17.95],
      [-65.59, 18.52],
    ],
  },
  PS: {
    name: 'Palestine',
    bounds: [
      [34.93, 31.35],
      [35.55, 32.53],
    ],
  },
  PT: {
    name: 'Portugal',
    bounds: [
      [-9.53, 36.84],
      [-6.39, 42.28],
    ],
  },
  PY: {
    name: 'Paraguay',
    bounds: [
      [-62.69, -27.55],
      [-54.29, -19.34],
    ],
  },
  QA: {
    name: 'Qatar',
    bounds: [
      [50.74, 24.56],
      [51.61, 26.11],
    ],
  },
  RO: {
    name: 'Romania',
    bounds: [
      [20.22, 43.69],
      [29.63, 48.22],
    ],
  },
  RS: {
    name: 'Serbia',
    bounds: [
      [18.83, 42.25],
      [22.99, 46.17],
    ],
  },
  RU: {
    name: 'Russia',
    bounds: [
      [27.29, 41.15],
      [180, 77.7],
    ],
  },
  RW: {
    name: 'Rwanda',
    bounds: [
      [29.02, -2.92],
      [30.82, -1.13],
    ],
  },
  SA: {
    name: 'Saudi Arabia',
    bounds: [
      [34.63, 16.35],
      [55.67, 32.16],
    ],
  },
  SB: {
    name: 'Solomon Is.',
    bounds: [
      [158.21, -8.54],
      [159.92, -7.32],
    ],
  },
  SD: {
    name: 'Sudan',
    bounds: [
      [21.94, 8.23],
      [38.41, 22],
    ],
  },
  SE: {
    name: 'Sweden',
    bounds: [
      [11.03, 55.36],
      [23.9, 69.11],
    ],
  },
  SI: {
    name: 'Slovenia',
    bounds: [
      [13.7, 45.45],
      [16.56, 46.85],
    ],
  },
  SK: {
    name: 'Slovakia',
    bounds: [
      [16.88, 47.76],
      [22.56, 49.57],
    ],
  },
  SL: {
    name: 'Sierra Leone',
    bounds: [
      [-13.25, 6.79],
      [-10.23, 10.05],
    ],
  },
  SN: {
    name: 'Senegal',
    bounds: [
      [-17.63, 12.33],
      [-11.47, 16.6],
    ],
  },
  SO: {
    name: 'Somalia',
    bounds: [
      [40.98, -1.68],
      [51.13, 12.02],
    ],
  },
  SR: {
    name: 'Suriname',
    bounds: [
      [-58.04, 1.82],
      [-53.96, 6.03],
    ],
  },
  SS: {
    name: 'S. Sudan',
    bounds: [
      [23.89, 3.51],
      [35.3, 12.25],
    ],
  },
  SV: {
    name: 'El Salvador',
    bounds: [
      [-90.1, 13.15],
      [-87.72, 14.42],
    ],
  },
  SY: {
    name: 'Syria',
    bounds: [
      [35.7, 32.31],
      [42.35, 37.23],
    ],
  },
  SZ: {
    name: 'eSwatini',
    bounds: [
      [30.68, -27.29],
      [32.07, -25.66],
    ],
  },
  TD: {
    name: 'Chad',
    bounds: [
      [13.54, 7.42],
      [23.89, 23.41],
    ],
  },
  TF: {
    name: 'Fr. S. Antarctic Lands',
    bounds: [
      [68.72, -49.77],
      [70.56, -48.62],
    ],
  },
  TG: {
    name: 'Togo',
    bounds: [
      [-0.05, 5.93],
      [1.87, 11.02],
    ],
  },
  TH: {
    name: 'Thailand',
    bounds: [
      [97.38, 5.69],
      [105.59, 20.42],
    ],
  },
  TJ: {
    name: 'Tajikistan',
    bounds: [
      [67.44, 36.74],
      [74.98, 40.96],
    ],
  },
  TL: {
    name: 'Timor-Leste',
    bounds: [
      [124.97, -9.39],
      [127.34, -8.27],
    ],
  },
  TM: {
    name: 'Turkmenistan',
    bounds: [
      [52.5, 35.27],
      [66.55, 42.75],
    ],
  },
  TN: {
    name: 'Tunisia',
    bounds: [
      [7.52, 30.31],
      [11.49, 37.35],
    ],
  },
  TR: {
    name: 'Turkey',
    bounds: [
      [26.17, 35.82],
      [44.79, 42.04],
    ],
  },
  TT: {
    name: 'Trinidad and Tobago',
    bounds: [
      [-61.95, 10],
      [-60.9, 10.89],
    ],
  },
  TW: {
    name: 'Taiwan',
    bounds: [
      [120.11, 21.97],
      [121.95, 25.3],
    ],
  },
  TZ: {
    name: 'Tanzania',
    bounds: [
      [29.34, -11.72],
      [40.32, -0.95],
    ],
  },
  UA: {
    name: 'Ukraine',
    bounds: [
      [22.09, 45.29],
      [40.08, 52.34],
    ],
  },
  UG: {
    name: 'Uganda',
    bounds: [
      [29.58, -1.44],
      [35.04, 4.25],
    ],
  },
  US: {
    name: 'United States of America',
    bounds: [
      [-124.69, 25.08],
      [-66.96, 49.39],
    ],
  },
  UY: {
    name: 'Uruguay',
    bounds: [
      [-58.43, -34.95],
      [-53.21, -30.11],
    ],
  },
  UZ: {
    name: 'Uzbekistan',
    bounds: [
      [55.93, 37.14],
      [73.06, 45.59],
    ],
  },
  VE: {
    name: 'Venezuela',
    bounds: [
      [-73.3, 0.72],
      [-59.76, 12.16],
    ],
  },
  VN: {
    name: 'Vietnam',
    bounds: [
      [102.17, 8.6],
      [109.34, 23.35],
    ],
  },
  VU: {
    name: 'Vanuatu',
    bounds: [
      [166.63, -15.74],
      [167.27, -14.63],
    ],
  },
  XK: {
    name: 'Kosovo',
    bounds: [
      [20.07, 41.85],
      [21.78, 43.27],
    ],
  },
  YE: {
    name: 'Yemen',
    bounds: [
      [42.6, 12.59],
      [53.11, 19.0],
    ],
  },
  ZA: {
    name: 'South Africa',
    bounds: [
      [16.34, -34.82],
      [32.83, -22.09],
    ],
  },
  ZM: {
    name: 'Zambia',
    bounds: [
      [21.89, -17.96],
      [33.49, -8.24],
    ],
  },
  ZW: {
    name: 'Zimbabwe',
    bounds: [
      [25.26, -22.27],
      [32.85, -15.51],
    ],
  },
};
