/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get authenticated user profile claims
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: Supabase user id (sub claim)
 *                 email:
 *                   type: string
 *                   nullable: true
 *                   description: User email from token claim (if present)
 *       401:
 *         description: Missing or invalid bearer token
 * /me:
 *   get:
 *     summary: Get authenticated caller identity
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated caller identity (alias of /profile)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Missing or invalid bearer token
 */
export const getProfileDoc = '';
