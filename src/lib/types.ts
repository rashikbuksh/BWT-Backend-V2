import type { OpenAPIHono, RouteConfig, RouteHandler } from '@hono/zod-openapi';
import type { PinoLogger } from 'hono-pino';

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
  };
};

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

export interface ColumnProps {
  default: string;
  datetime:
    | 'created_at'
    | 'updated_at'
    | 'deadline'
    | 'start_date'
    | 'end_date'
    | 'date'
    | 'date_of_birth'
    | 'appointment_date'
    | 'resign_date'
    | 'published_date'
    | 'from'
    | 'to'
    | 'price_validity'
    | 'next_due_date'
    | 'payment_date'
    | 'starting_date'
    | 'ending_date'
    | 'received_date'
    | 'store_received_date'
    | 'quotation_date'
    | 'cs_date'
    | 'monthly_meeting_date'
    | 'work_order_date'
    | 'delivery_statement_date'
    | 'monthly_meeting_schedule_date'
    | 'done_date'
    | 'started_at'
    | 'mid_started_at'
    | 'final_started_at'
    | 'ended_at'
    | 'commencement_date'
    | 'start_time'
    | 'end_time'
    | 'completed_date'
    | 'estimated_date'
    | 'ready_for_delivery_date'
    | 'status_update_date';
}

export interface PublicUrlProps { url: string; method: string }
