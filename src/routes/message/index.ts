// import { zValidator } from '@hono/zod-validator';

// const messages: Message[] = [];

// export const messagesRoute = app
//   .get('/messages', (c) => {
//     return c.json(messages);
//   })
//   .post(
//     '/messages',
//     zValidator('form', MessageFormSchema, (result, c) => {
//       if (!result.success) {
//         return c.json({ ok: false }, 400);
//       }
//     }),
//     async (c) => {
//       const param = c.req.valid('form');
//       const currentDateTime = new Date();
//       const message: Message = {
//         id: Number(currentDateTime),
//         date: currentDateTime.toLocaleString(),
//         ...param,
//       };
//       const data: DataToSend = {
//         action: publishActions.UPDATE_CHAT,
//         message,
//       };

//       messages.push(message);
//       server.publish(topic, JSON.stringify(data));

//       return c.json({ ok: true });
//     },
//   )
//   .delete('/messages/:id', (c) => {
//     // Logic of message deletion
//   });

// export type AppType = typeof messagesRoute;
