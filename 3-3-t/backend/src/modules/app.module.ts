import { Module, MiddlewareConsumer } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { InvoicesController } from './invoices/invoices.controller';
import { PaymentMethodsController } from './payments/payment-methods.controller';
import { PaymentsWebhookController } from './payments/payments-webhook.controller';
import { MembersController } from './organizations/members.controller';
import { AppSummaryController } from './app/app-summary.controller';
import { EntitlementsController } from './entitlements/entitlements.controller';
import { UsageController } from './usage/usage.controller';
import { AdminPlansController } from './admin/plans/admin-plans.controller';
import { AdminSubscriptionsController } from './admin/subscriptions/admin-subscriptions.controller';
import { AdminOverridesController } from './admin/overrides/admin-overrides.controller';
import { AdminRiskController } from './admin/risk/admin-risk.controller';
import { RevenueMetricsController } from './admin/metrics/revenue-metrics.controller';
import { UsageRankingController } from './admin/metrics/usage-ranking.controller';
import { AdminAuditController } from './admin/audit/admin-audit.controller';
import { AuthService } from './auth/auth.service';
import { OrganizationsRepository } from './organizations/organizations.repository';
import { MembersRepository } from './organizations/members.repository';
import { PlansRepository } from './plans/plans.repository';
import { SubscriptionsRepository } from './subscriptions/subscriptions.repository';
import { InvoicesRepository } from './invoices/invoices.repository';
import { PaymentMethodsRepository } from './payments/payment-methods.repository';
import { UsageRecordsRepository } from './usage/usage-records.repository';
import { UsageMeterService } from './usage/usage-meter.service';
import { SubscriptionStateMachineService } from './subscriptions/subscription-state-machine.service';
import { InvoiceStateMachineService } from './invoices/invoice-state-machine.service';
import { UpgradeSubscriptionService } from './subscriptions/use-cases/upgrade-subscription.service';
import { DowngradeSubscriptionService } from './subscriptions/use-cases/downgrade-subscription.service';
import { CancelSubscriptionService } from './subscriptions/use-cases/cancel-subscription.service';
import { CreateRecurringInvoiceService } from './invoices/use-cases/create-recurring-invoice.service';
import { ApplyPaymentResultService } from './payments/use-cases/apply-payment-result.service';
import { EntitlementEvaluatorService } from './entitlements/entitlement-evaluator.service';
import { EntitlementDecisionService } from './entitlements/entitlement-decision.service';
import { AuditService } from './audit/audit.service';
import { AuditEventsService } from './audit/audit-events.service';
import { IdempotencyService } from './payments/idempotency.service';
import { AdminOverrideRepository } from './admin/admin-override.repository';
import { AdminPlansService } from './admin/plans/admin-plans.service';
import { AdminSubscriptionsService } from './admin/subscriptions/admin-subscriptions.service';
import { AdminRiskService } from './admin/risk/admin-risk.service';
import { RevenueMetricsService } from './admin/metrics/revenue-metrics.service';
import { UsageRankingService } from './admin/metrics/usage-ranking.service';
import { AuditQueryService } from './audit/audit-query.service';
import { AdminOverrideGuardService } from './admin/overrides/admin-override-guard.service';
import { BillingSchedulerService } from './billing/billing-scheduler.service';
import { PaymentRetryWorker } from './payments/payment-retry.worker';
import { OrganizationContextMiddleware } from '../common/auth/organization-context.middleware';
import { UsagePeriodService } from './usage/use-cases/usage-period.service';
import { EnforceUsagePolicyService } from './usage/use-cases/enforce-usage-policy.service';

@Module({
  imports: [AuthModule],
  controllers: [
    SubscriptionsController,
    InvoicesController,
    PaymentMethodsController,
    PaymentsWebhookController,
    MembersController,
    AppSummaryController,
    EntitlementsController,
    UsageController,
    AdminPlansController,
    AdminSubscriptionsController,
    AdminOverridesController,
    AdminRiskController,
    RevenueMetricsController,
    UsageRankingController,
    AdminAuditController,
  ],
  providers: [
    PrismaService,
    AuthService,
    OrganizationsRepository,
    MembersRepository,
    PlansRepository,
    SubscriptionsRepository,
    InvoicesRepository,
    PaymentMethodsRepository,
    UsageRecordsRepository,
    UsageMeterService,
    SubscriptionStateMachineService,
    InvoiceStateMachineService,
    UpgradeSubscriptionService,
    DowngradeSubscriptionService,
    CancelSubscriptionService,
    CreateRecurringInvoiceService,
    ApplyPaymentResultService,
    EntitlementEvaluatorService,
    EntitlementDecisionService,
    AuditService,
    AuditEventsService,
    IdempotencyService,
    AdminOverrideRepository,
    AdminPlansService,
    AdminSubscriptionsService,
    AdminRiskService,
    RevenueMetricsService,
    UsageRankingService,
    AuditQueryService,
    AdminOverrideGuardService,
    BillingSchedulerService,
    PaymentRetryWorker,
    UsagePeriodService,
    EnforceUsagePolicyService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OrganizationContextMiddleware).forRoutes('*');
  }
}
