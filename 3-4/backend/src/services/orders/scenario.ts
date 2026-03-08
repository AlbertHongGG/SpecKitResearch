import { getPrisma } from '../../lib/db.js';
import { badRequest } from '../../api/errors.js';

export async function getSystemSettings() {
  const prisma = getPrisma();
  const s = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  if (!s) throw new Error('SystemSettings missing');
  return s;
}

export async function getEnabledPaymentMethod(code: string) {
  const prisma = getPrisma();
  const pm = await prisma.paymentMethod.findUnique({ where: { code } });
  if (!pm || !pm.enabled) throw badRequest('PAYMENT_METHOD_DISABLED', 'payment_method_code not enabled');
  return pm;
}

export async function getEnabledScenarioTemplate(scenario: string) {
  const prisma = getPrisma();
  const tpl = await prisma.simulationScenarioTemplate.findUnique({ where: { scenario: scenario as any } });
  if (!tpl || !tpl.enabled) throw badRequest('SCENARIO_DISABLED', 'simulation_scenario not enabled');
  return tpl;
}

export function resolveScenarioOverrides(input: {
  scenario: 'success' | 'failed' | 'cancelled' | 'timeout' | 'delayed_success';
  template: { defaultDelaySec: number; defaultErrorCode: string | null; defaultErrorMessage: string | null };
  overrides: { delaySec?: number; webhookDelaySec?: number | null; errorCode?: string | null; errorMessage?: string | null };
}) {
  const delaySec = input.overrides.delaySec ?? input.template.defaultDelaySec;
  const webhookDelaySec = input.overrides.webhookDelaySec ?? null;

  const isErrorScenario = input.scenario === 'failed' || input.scenario === 'timeout';
  const errorCode = isErrorScenario ? (input.overrides.errorCode ?? input.template.defaultErrorCode ?? 'ERROR') : null;
  const errorMessage = isErrorScenario
    ? (input.overrides.errorMessage ?? input.template.defaultErrorMessage ?? 'Error')
    : null;

  return { delaySec, webhookDelaySec, errorCode, errorMessage };
}

export function assertHttpUrl(url: string, fieldName: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw badRequest('VALIDATION_ERROR', `${fieldName} 必須為合法的 http/https URL`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw badRequest('VALIDATION_ERROR', `${fieldName} 必須為合法的 http/https URL`);
  }
}
