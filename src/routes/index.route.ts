import fde from './fde';
import hr from './hr';
import inquire from './inquire';
import lib from './lib';
import other from './other';
import portfolio from './portfolio';
import procure from './procure';
import report from './report';

const routes = [
  ...hr,
  ...portfolio,
  ...other,
  ...inquire,
  ...procure,
  ...report,
  ...lib,
  ...fde,
] as const;

export default routes;
