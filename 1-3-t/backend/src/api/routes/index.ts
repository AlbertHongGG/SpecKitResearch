import type { FastifyInstance } from 'fastify';

import { registerHealthRoutes } from './health';
import { registerSessionGetRoute } from './sessionGet';
import { registerAuthRegisterRoute } from './authRegister';
import { registerAuthLoginRoute } from './authLogin';
import { registerAuthLogoutRoute } from './authLogout';
import { registerCategoriesListRoute } from './categoriesList';
import { registerCategoriesCreateRoute } from './categoriesCreate';
import { registerCategoriesUpdateRoute } from './categoriesUpdate';
import { registerCategoriesToggleActiveRoute } from './categoriesToggleActive';
import { registerTransactionsCreateRoute } from './transactionsCreate';
import { registerTransactionsListRoute } from './transactionsList';
import { registerTransactionsUpdateRoute } from './transactionsUpdate';
import { registerTransactionsDeleteRoute } from './transactionsDelete';
import { registerReportsMonthlyGetRoute } from './reportsMonthlyGet';
import { registerReportsMonthlyCsvRoute } from './reportsMonthlyCsv';

export async function registerRoutes(app: FastifyInstance) {
  await registerHealthRoutes(app);
  await registerSessionGetRoute(app);
  await registerAuthRegisterRoute(app);
  await registerAuthLoginRoute(app);
  await registerAuthLogoutRoute(app);
  await registerCategoriesListRoute(app);
  await registerCategoriesCreateRoute(app);
  await registerCategoriesUpdateRoute(app);
  await registerCategoriesToggleActiveRoute(app);
  await registerTransactionsCreateRoute(app);
  await registerTransactionsListRoute(app);
  await registerTransactionsUpdateRoute(app);
  await registerTransactionsDeleteRoute(app);
  await registerReportsMonthlyGetRoute(app);
  await registerReportsMonthlyCsvRoute(app);
}
