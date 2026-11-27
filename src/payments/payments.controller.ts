import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { OrderStatus } from '../auth/user-role.enum';
import { OrdersService } from '../orders/orders.service';

/**
 * No JwtGuard: SSLCommerz's servers and the buyer's post-payment redirect
 * arrive without a session. Trust comes from re-verifying with SSLCommerz's
 * Validation API inside OrdersService.confirmPayment(), not from the request.
 */
@Controller('payments')
export class PaymentsController {
  constructor(private ordersService: OrdersService) {}

  /** Server-to-server notification. Needs a publicly reachable URL, so it
   *  never fires against localhost - the success callback covers that. */
  @Post('ipn')
  async ipn(@Body() body: Record<string, string>) {
    await this.ordersService.confirmPayment(body);
    return { received: true };
  }

  /** The buyer's browser lands here after paying (SSLCommerz POSTs to it). */
  @Post('success')
  async success(@Body() body: Record<string, string>, @Res() res: Response) {
    const paid = await this.ordersService.confirmPayment(body);
    return res.redirect(
      303,
      `${process.env.CORS_ORIGIN}/patient/orders?status=${paid ? 'success' : 'failed'}`,
    );
  }

  @Post('fail')
  async fail(@Body() body: Record<string, string>, @Res() res: Response) {
    await this.ordersService.markUnpaid(body.tran_id, OrderStatus.FAILED);
    return res.redirect(303, `${process.env.CORS_ORIGIN}/patient/orders?status=failed`);
  }

  @Post('cancel')
  async cancel(@Body() body: Record<string, string>, @Res() res: Response) {
    await this.ordersService.markUnpaid(body.tran_id, OrderStatus.CANCELLED);
    return res.redirect(303, `${process.env.CORS_ORIGIN}/patient/orders?status=cancelled`);
  }
}