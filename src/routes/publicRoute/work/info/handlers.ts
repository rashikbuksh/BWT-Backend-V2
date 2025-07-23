import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import { createApi } from '@/utils/api';

import type { GetOrderDetailsByInfoUuidForPublicRoute } from './routes';

export const getOrderDetailsByInfoUuidForPublic: AppRouteHandler<GetOrderDetailsByInfoUuidForPublicRoute> = async (c: any) => {
  const { info_uuid } = c.req.valid('param');
  const { diagnosis, process } = c.req.valid('query');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [info, order] = await Promise.all([
    fetchData(`/v1/work/info/${info_uuid}?public=true`),
    fetchData(`/v1/work/order-by-info/${info_uuid}?public=true`),
  ]);

  // Check if order.data exists and is an array before processing
  const orderData = order;

  // Process each order to fetch diagnosis and process data conditionally
  const enrichedOrders = await Promise.all(
    orderData.map(async (orderItem: any) => {
      const { uuid: order_uuid } = orderItem;

      try {
        const diagnosisData
            = diagnosis === 'true'
              ? await fetchData(
                  `/v1/work/diagnosis-by-order/${order_uuid}?public=true`,
                )
              : null;

        const processData
            = process === 'true'
              ? await fetchData(
                  `/v1/work/process?order_uuid=${order_uuid}?public=true`,
                )
              : null;

        return {
          ...orderItem,
          ...(diagnosisData
            ? { diagnosis: diagnosisData?.data }
            : {}),
          ...(processData ? { process: processData?.data } : {}),
        };
      }
      catch (error) {
        console.error(`Error enriching order ${order_uuid}:`, error);
        // Return order without enriched data if API calls fail
        return orderItem;
      }
    }),
  );
  enrichedOrders.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const response = {
    ...info,
    // order_entry: order?.data || [],
    order_entry: enrichedOrders || [],
  };

  return c.json(response, HSCode.OK);
};
