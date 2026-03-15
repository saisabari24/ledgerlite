import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LedgerService } from './ledger.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { TenantService } from '../tenant/tenant.service';

@Controller('tenants/:tenantId/ledger')
@UseGuards(AuthGuard('jwt'))
export class LedgerController {
  constructor(
    private readonly ledgerService: LedgerService,
    private readonly tenantService: TenantService,
  ) {}

  @Get('account/:accountId')
  async getAccountLedger(
    @Param('tenantId') tenantId: string,
    @Param('accountId') accountId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (user) await this.tenantService.assertAccess(user, tenantId);
    return this.ledgerService.getAccountLedger(tenantId, accountId, from, to);
  }

  @Get('dashboard')
  async getDashboard(
    @Param('tenantId') tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.ledgerService.getDashboardSummary(tenantId);
  }

  @Get('trial-balance')
  async getTrialBalance(
    @Param('tenantId') tenantId: string,
    @Query('asOf') asOf: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.ledgerService.getTrialBalance(tenantId, asOf);
  }

  @Get('profit-loss')
  async getProfitAndLoss(
    @Param('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.ledgerService.getProfitAndLoss(tenantId, from, to);
  }

  @Get('balance-sheet')
  async getBalanceSheet(
    @Param('tenantId') tenantId: string,
    @Query('asOf') asOf: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.tenantService.assertAccess(user, tenantId);
    return this.ledgerService.getBalanceSheet(tenantId, asOf);
  }
}
