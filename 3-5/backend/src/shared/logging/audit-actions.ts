export const AuditActions = {
  ApiKeyCreate: 'api_key.create',
  ApiKeyUpdate: 'api_key.update',
  ApiKeyRevoke: 'api_key.revoke',
  ApiKeyRotate: 'api_key.rotate',
  ApiKeyBlock: 'api_key.block',

  AdminServiceCreate: 'admin.service.create',
  AdminServiceUpdate: 'admin.service.update',
  AdminEndpointCreate: 'admin.endpoint.create',
  AdminEndpointUpdate: 'admin.endpoint.update',
  AdminScopeCreate: 'admin.scope.create',
  AdminScopeUpdate: 'admin.scope.update',
  AdminScopeRuleCreate: 'admin.scope_rule.create',
  AdminScopeRuleDelete: 'admin.scope_rule.delete',

  AdminUserDisable: 'admin.user.disable',
  AdminRateLimitPolicyUpdate: 'admin.rate_limit_policy.update',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
