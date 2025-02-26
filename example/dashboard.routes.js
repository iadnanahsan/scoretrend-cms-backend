const express = require("express")
const router = express.Router()
const {dashboardMiddleware} = require("../../middlewares/auth/dashboard.middleware")
const {getTaskTrends} = require("../../controllers/dashboard/shared/task.trends.controller")
const {getTeamPerformance} = require("../../controllers/dashboard/shared/team.performance.controller.js")
const {getOnTimeVsLateCompletedTasks} = require("../../controllers/dashboard/shared/task.completion.ontime-late")
const {getOnTimeVsLateStartTasks} = require("../../controllers/dashboard/shared/task.start.ontime-late")
const {getPriorityBreakdown} = require("../../controllers/dashboard/shared/priority.breakdown.controller")
const {getOverdueTasksTrend} = require("../../controllers/dashboard/shared/task.overdue.js")
const {getTaskStatusOverview} = require("../../controllers/dashboard/shared/task.status.overview.controller")
const {getTaskStatistics} = require("../../controllers/dashboard/shared/task.statistics.controller")
const {getProjectCompletionPercentage} = require("../../controllers/dashboard/shared/project.completion.controller")
const {
	getRecentTasks,
	searchProjects,
	searchTags,
	searchDepartments,
	searchDepartmentRoles,
} = require("../../controllers/dashboard/shared/recent.tasks.controller")

const {getDashboardStats} = require("../../controllers/dashboard/shared/dashboard.stats.controller")

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: |
 *     These endpoints provide analytics for Landing, Workspace, Project, and Profile dashboards.
 *     They offer role-based data and insights for different date ranges and aggregation periods.
 */

/**
 * @swagger
 * /api/dashboard/stats/summary:
 *   get:
 *     summary: Fetch landing dashboard statistics
 *     description: |
 *       Retrieves task statistics for the landing dashboard view.
 *       Results are scoped based on user roles and ownership of workspaces.
 *
 *       **Key Features:**
 *       - Task statistics specific to the landing dashboard
 *       - Aggregates data across owned workspaces
 *       - Role-based access control
 *       - Includes key task metrics (e.g., To-Do, In-Progress, Completed)
 *       - Supports date range filtering (start date, end date, and presets)
 *       - Results cached with view-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if date range parameters are invalid
 *       - Returns 403 if user lacks access to any owned workspace
 *       - Returns empty task statistics if no data exists within the scope
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime, custom]
 *         description: Date range preset for task statistics
 *         example: "lastMonth"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (used when preset is "custom")
 *         example: "2023-12-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (used when preset is "custom")
 *         example: "2023-12-07"
 *     responses:
 *       200:
 *         description: Successfully retrieved landing dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTasks:
 *                       type: integer
 *                       example: 100
 *                     todoTasks:
 *                       type: integer
 *                       example: 20
 *                     inProgressTasks:
 *                       type: integer
 *                       example: 40
 *                     inReviewTasks:
 *                       type: integer
 *                       example: 30
 *                     completedTasks:
 *                       type: integer
 *                       example: 10
 *                     overdueTasks:
 *                       type: integer
 *                       example: 5
 *                     expiredTasks:
 *                       type: integer
 *                       example: 0
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           example: "2023-12-01"
 *                         endDate:
 *                           type: string
 *                           example: "2023-12-07"
 *                         label:
 *                           type: string
 *                           example: "Last Month"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                           example: true
 *                         key:
 *                           type: string
 *                           example: "stats/summary:landing:user-123:2023-12-01:2023-12-07"
 *                         ttl:
 *                           type: integer
 *                           example: 180
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid date range provided"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User lacks access to any owned workspaces"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch landing dashboard statistics"
 */
router.get("/stats/summary", dashboardMiddleware("landing"), getDashboardStats)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/stats/summary:
 *   get:
 *     summary: Fetch workspace dashboard statistics
 *     description: |
 *       Retrieves task statistics for a specific workspace dashboard view.
 *       Results are scoped based on the workspace and user roles within it.
 *
 *       **Key Features:**
 *       - Task statistics specific to the workspace dashboard
 *       - Aggregates data across all projects in the workspace
 *       - Role-based access control ensures secure data scoping
 *       - Includes key task metrics (e.g., To-Do, In-Progress, Completed)
 *       - Supports date range filtering (start date, end date, and presets)
 *       - Results cached with workspace-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if date range parameters are invalid
 *       - Returns 403 if user lacks access to the workspace
 *       - Returns empty task statistics if no data exists within the scope
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to fetch statistics for
 *         example: 123
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime, custom]
 *         description: Date range preset for task statistics
 *         example: "lastMonth"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (used when preset is "custom")
 *         example: "2023-12-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (used when preset is "custom")
 *         example: "2023-12-07"
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTasks:
 *                       type: integer
 *                       example: 100
 *                     todoTasks:
 *                       type: integer
 *                       example: 20
 *                     inProgressTasks:
 *                       type: integer
 *                       example: 40
 *                     inReviewTasks:
 *                       type: integer
 *                       example: 30
 *                     completedTasks:
 *                       type: integer
 *                       example: 10
 *                     overdueTasks:
 *                       type: integer
 *                       example: 5
 *                     expiredTasks:
 *                       type: integer
 *                       example: 0
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           example: "2023-12-01"
 *                         endDate:
 *                           type: string
 *                           example: "2023-12-07"
 *                         label:
 *                           type: string
 *                           example: "Last Month"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                           example: true
 *                         key:
 *                           type: string
 *                           example: "stats/summary:workspace-123:user-123:2023-12-01:2023-12-07"
 *                         ttl:
 *                           type: integer
 *                           example: 300
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid date range provided"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User lacks access to the specified workspace"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch workspace dashboard statistics"
 */
router.get("/workspace/:workspaceId/stats/summary", dashboardMiddleware("workspace"), getDashboardStats)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/stats/summary:
 *   get:
 *     summary: Fetch project dashboard statistics
 *     description: |
 *       Retrieves task statistics for a specific project within a workspace.
 *       Results are scoped based on the project and user roles within it.
 *
 *       **Key Features:**
 *       - Task statistics specific to the project dashboard
 *       - Aggregates data for the specified project only
 *       - Role-based access control ensures secure data scoping
 *       - Includes key task metrics (e.g., To-Do, In-Progress, Completed)
 *       - Supports date range filtering (start date, end date, and presets)
 *       - Results cached with project-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if date range parameters are invalid
 *       - Returns 403 if user lacks access to the project
 *       - Returns 404 if the project or workspace is not found
 *       - Returns empty task statistics if no data exists within the scope
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the parent workspace
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to fetch statistics for
 *         example: 456
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime, custom]
 *         description: Date range preset for task statistics
 *         example: "lastMonth"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (used when preset is "custom")
 *         example: "2023-12-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (used when preset is "custom")
 *         example: "2023-12-07"
 *     responses:
 *       200:
 *         description: Successfully retrieved project dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTasks:
 *                       type: integer
 *                       example: 100
 *                     todoTasks:
 *                       type: integer
 *                       example: 20
 *                     inProgressTasks:
 *                       type: integer
 *                       example: 40
 *                     inReviewTasks:
 *                       type: integer
 *                       example: 30
 *                     completedTasks:
 *                       type: integer
 *                       example: 10
 *                     overdueTasks:
 *                       type: integer
 *                       example: 5
 *                     expiredTasks:
 *                       type: integer
 *                       example: 0
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           example: "2023-12-01"
 *                         endDate:
 *                           type: string
 *                           example: "2023-12-07"
 *                         label:
 *                           type: string
 *                           example: "Last Month"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                           example: true
 *                         key:
 *                           type: string
 *                           example: "stats/summary:project-456:workspace-123:user-123:2023-12-01:2023-12-07"
 *                         ttl:
 *                           type: integer
 *                           example: 300
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid date range provided"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User lacks access to the specified project"
 *       404:
 *         description: Project or workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Specified project or workspace not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch project dashboard statistics"
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/stats/summary",
	dashboardMiddleware("project"),
	getDashboardStats
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/stats/summary:
 *   get:
 *     summary: Fetch profile dashboard statistics
 *     description: |
 *       Retrieves task statistics for a user's profile dashboard view.
 *       Results are scoped to tasks assigned to the specified user.
 *
 *       **Key Features:**
 *       - Task statistics specific to the profile dashboard
 *       - Aggregates data for tasks assigned to the user
 *       - Includes key task metrics (e.g., To-Do, In-Progress, Completed)
 *       - Supports role-based access control for viewing others' profiles
 *       - Supports date range filtering (start date, end date, and presets)
 *       - Results cached with profile-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if date range parameters are invalid
 *       - Returns 403 if user lacks access to view the profile
 *       - Returns 404 if the profile is not found
 *       - Returns empty task statistics if no data exists within the scope
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user profile to fetch statistics for
 *         example: 789
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime, custom]
 *         description: Date range preset for task statistics
 *         example: "lastMonth"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom start date (used when preset is "custom")
 *         example: "2023-12-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Custom end date (used when preset is "custom")
 *         example: "2023-12-07"
 *     responses:
 *       200:
 *         description: Successfully retrieved profile dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTasks:
 *                       type: integer
 *                       example: 50
 *                     todoTasks:
 *                       type: integer
 *                       example: 15
 *                     inProgressTasks:
 *                       type: integer
 *                       example: 20
 *                     inReviewTasks:
 *                       type: integer
 *                       example: 10
 *                     completedTasks:
 *                       type: integer
 *                       example: 5
 *                     overdueTasks:
 *                       type: integer
 *                       example: 3
 *                     expiredTasks:
 *                       type: integer
 *                       example: 2
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         startDate:
 *                           type: string
 *                           example: "2023-12-01"
 *                         endDate:
 *                           type: string
 *                           example: "2023-12-07"
 *                         label:
 *                           type: string
 *                           example: "Last Month"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                           example: true
 *                         key:
 *                           type: string
 *                           example: "stats/summary:profile-789:user-789:2023-12-01:2023-12-07"
 *                         ttl:
 *                           type: integer
 *                           example: 180
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid date range provided"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User lacks access to view this profile"
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Specified profile not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to fetch profile dashboard statistics"
 */
router.get("/profile/:userId/stats/summary", dashboardMiddleware("profile"), getDashboardStats)

/**
 * @swagger
 * components:
 *   schemas:
 *     TaskTrendsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               period:
 *                 type: string
 *                 description: Human-readable period label (e.g., "January 2025").
 *                 example: "January 2025"
 *               periodKey:
 *                 type: string
 *                 format: date-time
 *                 description: Machine-sortable timestamp for the period.
 *                 example: "2025-01-01T00:00:00.000Z"
 *               completedTasks:
 *                 type: integer
 *                 description: Number of tasks marked as completed in the period.
 *                 example: 150
 *               newTasks:
 *                 type: integer
 *                 description: Number of new tasks created in the period.
 *                 example: 250
 *               total:
 *                 type: integer
 *                 description: Total tasks in the specified period.
 *                 example: 400
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   description: Start date of the data range.
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   description: End date of the data range.
 *                   example: "2025-01-31"
 *                 label:
 *                   type: string
 *                   description: Human-readable label for the date range.
 *                   example: "Last Month"
 *             aggregation:
 *               type: object
 *               properties:
 *                 period:
 *                   type: string
 *                   description: Aggregation period (daily, weekly, monthly).
 *                   example: "daily"
 *                 totalPeriods:
 *                   type: integer
 *                   description: Total number of periods in the range.
 *                   example: 31
 *             summary:
 *               type: object
 *               properties:
 *                 totalTasks:
 *                   type: integer
 *                   description: Total tasks across the date range.
 *                   example: 400
 *                 totalCompleted:
 *                   type: integer
 *                   description: Total tasks completed in the date range.
 *                   example: 150
 *                 totalNew:
 *                   type: integer
 *                   description: Total new tasks created in the date range.
 *                   example: 250
 *                 averagePerPeriod:
 *                   type: number
 *                   description: Average tasks per period.
 *                   example: 12.9
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the data generation.
 *               example: "2025-01-08T16:20:46.742Z"
 */

/**
 * @swagger
 * /api/dashboard/task-trends:
 *   get:
 *     summary: Get Task Trends for Landing Dashboard
 *     description: |
 *       Fetches task trends aggregated across all workspaces owned by the authenticated user.
 *       The data includes completed tasks, new tasks, and totals for the specified date range.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timePeriod
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation period for trends.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved task trends for the landing dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskTrendsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/task-trends", dashboardMiddleware("landing"), getTaskTrends)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/task-trends:
 *   get:
 *     summary: Get Task Trends for Workspace Dashboard
 *     description: |
 *       Retrieves task trends for a specific workspace, showing all data from the projects under the specified workspace.
 *       The response includes completed tasks, new tasks, and totals for the specified date range.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the workspace to fetch trends for.
 *       - in: query
 *         name: timePeriod
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation period for trends.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace trends.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskTrendsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Access denied to the workspace.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/workspace/:workspaceId/task-trends", dashboardMiddleware("workspace"), getTaskTrends)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/task-trends:
 *   get:
 *     summary: Get Task Trends for Project Dashboard
 *     description: |
 *       Fetches detailed task trends for a specific project, including metrics such as completed and new tasks.
 *       The response includes data for the specified date range and aggregation period.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project.
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to fetch trends for.
 *       - in: query
 *         name: timePeriod
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation period for trends.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved project trends.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskTrendsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Access denied to the project.
 *       404:
 *         description: Project not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/workspaces/:workspaceId/projects/:projectId/task-trends", dashboardMiddleware("project"), getTaskTrends)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/task-trends:
 *   get:
 *     summary: Get Task Trends for Profile Dashboard
 *     description: |
 *       Retrieves task trends for a user's profile, showing data specific to tasks assigned to that user.
 *       The response includes completed tasks, new tasks, and totals for the specified date range.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose task trends are being analyzed.
 *       - in: query
 *         name: timePeriod
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation period for trends.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved task trends for the user profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskTrendsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view this profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/task-trends", dashboardMiddleware("profile"), getTaskTrends)

/**
 * @swagger
 * components:
 *   schemas:
 *     TeamPerformanceResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             overall:
 *               type: object
 *               properties:
 *                 performanceScore:
 *                   type: number
 *                   format: float
 *                   description: Overall performance score for the team.
 *                   example: 78.5
 *                 distribution:
 *                   type: object
 *                   properties:
 *                     inProgress:
 *                       type: number
 *                       description: Percentage of tasks in progress.
 *                       example: 25.5
 *                     done:
 *                       type: number
 *                       description: Percentage of tasks completed.
 *                       example: 45.2
 *                     lateCompleted:
 *                       type: number
 *                       description: Percentage of tasks completed late.
 *                       example: 12.3
 *                     inReview:
 *                       type: number
 *                       description: Percentage of tasks in review.
 *                       example: 8.4
 *                     overdue:
 *                       type: number
 *                       description: Percentage of overdue tasks.
 *                       example: 6.8
 *                     expired:
 *                       type: number
 *                       description: Percentage of expired tasks.
 *                       example: 1.8
 *             period:
 *               type: object
 *               properties:
 *                 performanceScore:
 *                   type: number
 *                   format: float
 *                   description: Performance score for the specified period.
 *                   example: 82.3
 *                 distribution:
 *                   $ref: '#/components/schemas/Distribution'
 *             _meta:
 *               type: object
 *               properties:
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       description: Type of date range (e.g., lastMonth, lastQuarter).
 *                       example: "lastMonth"
 *                     label:
 *                       type: string
 *                       description: Human-readable label for the date range.
 *                       example: "Last Month"
 *                     startDate:
 *                       type: string
 *                       format: date
 *                       description: Start date of the date range.
 *                       example: "2025-01-01"
 *                     endDate:
 *                       type: string
 *                       format: date
 *                       description: End date of the date range.
 *                       example: "2025-01-31"
 *                 counts:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total number of tasks.
 *                       example: 2837
 *                     period:
 *                       type: integer
 *                       description: Number of tasks in the specified period.
 *                       example: 456
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp of the data generation.
 *                   example: "2025-01-08T16:20:46.742Z"
 */

/**
 * @swagger
 * /api/dashboard/team-performance:
 *   get:
 *     summary: Get Team Performance for Landing Dashboard
 *     description: |
 *       Retrieves team performance metrics aggregated across all workspaces owned by the authenticated user.
 *       The response includes performance scores, task distribution, and period-specific metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Successfully retrieved team performance metrics for the landing dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamPerformanceResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/team-performance", dashboardMiddleware("landing"), getTeamPerformance)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/team-performance:
 *   get:
 *     summary: Get Team Performance for Workspace Dashboard
 *     description: |
 *       Retrieves team performance metrics for a specific workspace, showing aggregated data from tasks within the workspace's projects.
 *       The response includes performance scores, task distribution, and period-specific metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to analyze.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Successfully retrieved team performance metrics for the workspace dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamPerformanceResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Access denied to the workspace.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/workspace/:workspaceId/team-performance", dashboardMiddleware("workspace"), getTeamPerformance)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/team-performance:
 *   get:
 *     summary: Get Team Performance for Project Dashboard
 *     description: |
 *       Retrieves team performance metrics for a specific project, showing detailed data for tasks within the project.
 *       The response includes performance scores, task distribution, and period-specific metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project.
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to analyze.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Successfully retrieved team performance metrics for the project dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamPerformanceResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Access denied to the project.
 *       404:
 *         description: Project not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspaces/:workspaceId/projects/:projectId/team-performance",
	dashboardMiddleware("project"),
	getTeamPerformance
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/team-performance:
 *   get:
 *     summary: Get Team Performance for Profile Dashboard
 *     description: |
 *       Retrieves team performance metrics for tasks assigned to the specified user, including aggregated and period-specific data.
 *       The response includes performance scores, task distribution, and period-specific metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose team performance metrics are being analyzed.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *     responses:
 *       200:
 *         description: Successfully retrieved team performance metrics for the profile dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamPerformanceResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view this profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/team-performance", dashboardMiddleware("profile"), getTeamPerformance)

/**
 * @swagger
 * components:
 *   schemas:
 *     CompletionStatsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             January:
 *               type: object
 *               properties:
 *                 "On Time":
 *                   type: integer
 *                   example: 45
 *                 "Late":
 *                   type: integer
 *                   example: 12
 *             # Additional months follow same pattern
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   example: "2025-12-31"
 *                 label:
 *                   type: string
 *                   example: "Last 12 months"
 *             context:
 *               type: object
 *               properties:
 *                 viewType:
 *                   type: string
 *                   enum: [landing, workspace, project, profile]
 *                   example: "workspace"
 *                 workspaceId:
 *                   type: integer
 *                   example: 123
 *                 departmentId:
 *                   type: integer
 *                   example: 45
 *             totals:
 *               type: object
 *               properties:
 *                 totalOnTime:
 *                   type: integer
 *                   example: 540
 *                 totalLate:
 *                   type: integer
 *                   example: 144
 *                 totalTasks:
 *                   type: integer
 *                   example: 684
 *                 onTimePercentage:
 *                   type: string
 *                   example: "78.95"
 *             cache:
 *               type: object
 *               properties:
 *                 hit:
 *                   type: boolean
 *                   example: false
 *                 key:
 *                   type: string
 *                   example: "ontime-late-task-completion:workspace:ADMIN:workspace-123:2025-01-01:2025-12-31"
 *                 ttl:
 *                   type: integer
 *                   example: 300
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               example: "2025-01-13T17:41:56.849Z"
 */

/**
 * @swagger
 * /api/dashboard/ontime-late-task-completion:
 *   get:
 *     summary: Get Task Completion Statistics for Landing Dashboard
 *     description: |
 *       Retrieves aggregated statistics showing the ratio of on-time vs late task completions.
 *       This endpoint provides a monthly breakdown and includes role-based access control.
 *       For admin users, shows data across all departments. For other users, shows data
 *       from their owned workspaces only.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets
 *     responses:
 *       200:
 *         description: Successfully retrieved completion statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompletionStatsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.get("/ontime-late-task-completion", dashboardMiddleware("landing"), getOnTimeVsLateCompletedTasks)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/ontime-late-task-completion:
 *   get:
 *     summary: Get Task Completion Statistics for Workspace Dashboard
 *     description: |
 *       Retrieves workspace-specific completion statistics with role-based filtering.
 *       Shows the ratio of on-time vs late completions for all tasks within the workspace's projects.
 *       Access is restricted based on workspace membership and role.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to analyze
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace completion statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompletionStatsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Insufficient workspace access
 *       404:
 *         description: Workspace not found
 *       500:
 *         description: Internal server error
 */
router.get(
	"/workspace/:workspaceId/ontime-late-task-completion",
	dashboardMiddleware("workspace"),
	getOnTimeVsLateCompletedTasks
)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/ontime-late-task-completion:
 *   get:
 *     summary: Get Task Completion Statistics for Project Dashboard
 *     description: |
 *       Retrieves project-specific completion statistics showing on-time vs late task completions.
 *       Includes context-aware caching and role-based access control at the project level.
 *       Access requires appropriate project membership or admin privileges.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to analyze
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets
 *     responses:
 *       200:
 *         description: Successfully retrieved project completion statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompletionStatsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Insufficient project access
 *       404:
 *         description: Project or workspace not found
 *       500:
 *         description: Internal server error
 */
router.get(
	"/workspaces/:workspaceId/projects/:projectId/ontime-late-task-completion",
	dashboardMiddleware("project"),
	getOnTimeVsLateCompletedTasks
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/ontime-late-task-completion:
 *   get:
 *     summary: Get Task Completion Statistics for Profile Dashboard
 *     description: |
 *       Retrieves completion statistics for tasks assigned to a specific user.
 *       Features context-aware caching and proper permission checks for profile access.
 *       Users can view their own stats, while admins can access any profile's statistics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose completion stats are being analyzed
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD)
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets
 *     responses:
 *       200:
 *         description: Successfully retrieved profile completion statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CompletionStatsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Insufficient permissions to view profile
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get(
	"/profile/:userId/ontime-late-task-completion",
	dashboardMiddleware("profile"),
	getOnTimeVsLateCompletedTasks
)

/**
 * @swagger
 * components:
 *   schemas:
 *     StartTasksResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               "On Time":
 *                 type: integer
 *                 description: Number of tasks started on time for the month.
 *                 example: 45
 *               Late:
 *                 type: integer
 *                 description: Number of tasks started late for the month.
 *                 example: 12
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   description: Start date of the data range.
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   description: End date of the data range.
 *                   example: "2025-12-31"
 *                 label:
 *                   type: string
 *                   description: Human-readable label for the date range.
 *                   example: "Last 12 months"
 *             context:
 *               type: object
 *               properties:
 *                 viewType:
 *                   type: string
 *                   enum: [landing, workspace, project, profile]
 *                   description: Type of dashboard view.
 *                   example: "workspace"
 *                 workspaceId:
 *                   type: integer
 *                   description: ID of the workspace (if applicable).
 *                   example: 123
 *                 projectId:
 *                   type: integer
 *                   description: ID of the project (if applicable).
 *                   example: 456
 *                 departmentId:
 *                   type: integer
 *                   description: ID of the department (if applicable).
 *                   example: 789
 *             metrics:
 *               type: object
 *               properties:
 *                 totalTasks:
 *                   type: integer
 *                   description: Total number of tasks in the date range.
 *                   example: 684
 *                 totalOnTime:
 *                   type: integer
 *                   description: Total tasks started on time.
 *                   example: 540
 *                 totalLate:
 *                   type: integer
 *                   description: Total tasks started late.
 *                   example: 144
 *                 onTimePercentage:
 *                   type: string
 *                   description: Percentage of tasks started on time.
 *                   example: "78.95"
 *                 trend:
 *                   type: object
 *                   properties:
 *                     direction:
 *                       type: string
 *                       enum: [up, down]
 *                       description: Trend direction for on-time task starts.
 *                       example: "up"
 *                     change:
 *                       type: string
 *                       description: Percentage change in on-time task starts.
 *                       example: "5.25"
 *             cache:
 *               type: object
 *               properties:
 *                 hit:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                   example: false
 *                 key:
 *                   type: string
 *                   description: Cache key used for this request.
 *                   example: "start-tasks-analysis:workspace:ADMIN:workspace-123:2025-01-01:2025-12-31"
 *                 ttl:
 *                   type: integer
 *                   description: Time-to-live (TTL) for the cached data in seconds.
 *                   example: 600
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the data generation.
 *               example: "2025-01-13T17:41:56.849Z"
 */

/**
 * @swagger
 * /api/dashboard/ontime-late-task-start:
 *   get:
 *     summary: Get On-Time vs Late Start Tasks for Landing Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of tasks started on time vs. late across all workspaces
 *       accessible to the authenticated user. The data is aggregated by month and includes
 *       totals, percentages, and trend analysis.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved on-time vs late start task metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StartTasksResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/ontime-late-task-start", dashboardMiddleware("landing"), getOnTimeVsLateStartTasks)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/ontime-late-task-start:
 *   get:
 *     summary: Get On-Time vs Late Start Tasks for Workspace Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of tasks started on time vs. late for a specific workspace.
 *       The data is aggregated by month and includes totals, percentages, and trend analysis.
 *       Access is restricted to users with permission to view the workspace.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to analyze.
 *         example: 123
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace-specific on-time vs late start task metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StartTasksResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient workspace access.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspace/:workspaceId/ontime-late-task-start",
	dashboardMiddleware("workspace"),
	getOnTimeVsLateStartTasks
)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/ontime-late-task-start:
 *   get:
 *     summary: Get On-Time vs Late Start Tasks for Project Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of tasks started on time vs. late for a specific project.
 *       The data is aggregated by month and includes totals, percentages, and trend analysis.
 *       Access is restricted to users with permission to view the project.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project.
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to analyze.
 *         example: 456
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved project-specific on-time vs late start task metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StartTasksResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient project access.
 *       404:
 *         description: Project or workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspaces/:workspaceId/projects/:projectId/ontime-late-task-start",
	dashboardMiddleware("project"),
	getOnTimeVsLateStartTasks
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/ontime-late-task-start:
 *   get:
 *     summary: Get On-Time vs Late Start Tasks for Profile Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of tasks started on time vs. late for a specific user's profile.
 *       The data is aggregated by month and includes totals, percentages, and trend analysis.
 *       Users can view their own stats, while admins can access any profile's statistics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose task metrics are being analyzed.
 *         example: 789
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved profile-specific on-time vs late start task metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StartTasksResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/ontime-late-task-start", dashboardMiddleware("profile"), getOnTimeVsLateStartTasks)

/**
 * @swagger
 * components:
 *   schemas:
 *     PriorityBreakdownResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               total:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
 *                 description: Total task counts by status for the priority.
 *                 example:
 *                   TODO: 10
 *                   IN_PROGRESS: 5
 *                   DONE: 20
 *               period:
 *                 type: object
 *                 additionalProperties:
 *                   type: integer
 *                 description: Task counts by status for the specified period.
 *                 example:
 *                   TODO: 2
 *                   IN_PROGRESS: 1
 *                   DONE: 5
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   description: Start date of the data range.
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   description: End date of the data range.
 *                   example: "2025-12-31"
 *                 label:
 *                   type: string
 *                   description: Human-readable label for the date range.
 *                   example: "Last 12 months"
 *             context:
 *               type: object
 *               properties:
 *                 viewType:
 *                   type: string
 *                   enum: [landing, workspace, project, profile]
 *                   description: Type of dashboard view.
 *                   example: "workspace"
 *                 workspaceId:
 *                   type: integer
 *                   description: ID of the workspace (if applicable).
 *                   example: 123
 *                 projectId:
 *                   type: integer
 *                   description: ID of the project (if applicable).
 *                   example: 456
 *                 departmentId:
 *                   type: integer
 *                   description: ID of the department (if applicable).
 *                   example: 789
 *             summary:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of tasks in the date range.
 *                   example: 684
 *                 period:
 *                   type: integer
 *                   description: Number of tasks in the specified period.
 *                   example: 456
 *                 priorityDistribution:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       total:
 *                         type: integer
 *                         description: Total tasks for the priority.
 *                         example: 100
 *                       period:
 *                         type: integer
 *                         description: Tasks for the priority in the specified period.
 *                         example: 50
 *                       percentage:
 *                         type: string
 *                         description: Percentage of tasks for the priority.
 *                         example: "25.00"
 *             priorities:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of valid priorities.
 *               example: ["URGENT", "HIGH", "MEDIUM", "LOW"]
 *             cache:
 *               type: object
 *               properties:
 *                 hit:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                   example: false
 *                 key:
 *                   type: string
 *                   description: Cache key used for this request.
 *                   example: "priority-breakdown:workspace:ADMIN:workspace-123:2025-01-01:2025-12-31"
 *                 ttl:
 *                   type: integer
 *                   description: Time-to-live (TTL) for the cached data in seconds.
 *                   example: 600
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the data generation.
 *               example: "2025-01-13T17:41:56.849Z"
 */

/**
 * @swagger
 * /api/dashboard/priority-breakdown:
 *   get:
 *     summary: Get Priority Breakdown for Landing Dashboard
 *     description: |
 *       Retrieves a breakdown of tasks by priority across all workspaces accessible to the authenticated user.
 *       The data includes total and period-specific task counts by status for each priority level.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved priority breakdown metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriorityBreakdownResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/priority-breakdown", dashboardMiddleware("landing"), getPriorityBreakdown)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/priority-breakdown:
 *   get:
 *     summary: Get Priority Breakdown for Workspace Dashboard
 *     description: |
 *       Retrieves a breakdown of tasks by priority for a specific workspace.
 *       The data includes total and period-specific task counts by status for each priority level.
 *       Access is restricted to users with permission to view the workspace.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to analyze.
 *         example: 123
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace-specific priority breakdown metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriorityBreakdownResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient workspace access.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/workspace/:workspaceId/priority-breakdown", dashboardMiddleware("workspace"), getPriorityBreakdown)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/priority-breakdown:
 *   get:
 *     summary: Get Priority Breakdown for Project Dashboard
 *     description: |
 *       Retrieves a breakdown of tasks by priority for a specific project.
 *       The data includes total and period-specific task counts by status for each priority level.
 *       Access is restricted to users with permission to view the project.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project.
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to analyze.
 *         example: 456
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved project-specific priority breakdown metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriorityBreakdownResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient project access.
 *       404:
 *         description: Project or workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/priority-breakdown",
	dashboardMiddleware("project"),
	getPriorityBreakdown
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/priority-breakdown:
 *   get:
 *     summary: Get Priority Breakdown for Profile Dashboard
 *     description: |
 *       Retrieves a breakdown of tasks by priority for a specific user's profile.
 *       The data includes total and period-specific task counts by status for each priority level.
 *       Users can view their own stats, while admins can access any profile's statistics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose task metrics are being analyzed.
 *         example: 789
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved profile-specific priority breakdown metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriorityBreakdownResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/priority-breakdown", dashboardMiddleware("profile"), getPriorityBreakdown)

/**
 * @swagger
 * components:
 *   schemas:
 *     OverdueTasksTrendResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 description: Formatted date or period label based on the aggregation view.
 *                 example: "Mon, Jan 1"
 *               count:
 *                 type: integer
 *                 description: Number of overdue tasks for the date or period.
 *                 example: 12
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   description: Start date of the data range.
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   description: End date of the data range.
 *                   example: "2025-12-31"
 *                 label:
 *                   type: string
 *                   description: Human-readable label for the date range.
 *                   example: "Last 12 months"
 *             context:
 *               type: object
 *               properties:
 *                 viewType:
 *                   type: string
 *                   enum: [landing, workspace, project, profile]
 *                   description: Type of dashboard view.
 *                   example: "workspace"
 *                 workspaceId:
 *                   type: integer
 *                   description: ID of the workspace (if applicable).
 *                   example: 123
 *                 projectId:
 *                   type: integer
 *                   description: ID of the project (if applicable).
 *                   example: 456
 *                 departmentId:
 *                   type: integer
 *                   description: ID of the department (if applicable).
 *                   example: 789
 *             aggregation:
 *               type: object
 *               properties:
 *                 view:
 *                   type: string
 *                   enum: [daily, weekly, monthly]
 *                   description: Aggregation level for the data.
 *                   example: "daily"
 *                 unit:
 *                   type: string
 *                   description: Time unit for aggregation (day, week, or month).
 *                   example: "day"
 *             summary:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Total number of overdue tasks in the date range.
 *                   example: 50
 *                 average:
 *                   type: number
 *                   format: float
 *                   description: Average number of overdue tasks per period.
 *                   example: 2.5
 *                 peak:
 *                   type: integer
 *                   description: Maximum number of overdue tasks in a single period.
 *                   example: 12
 *                 trend:
 *                   type: object
 *                   properties:
 *                     direction:
 *                       type: string
 *                       enum: [up, down]
 *                       description: Trend direction for overdue tasks.
 *                       example: "up"
 *                     change:
 *                       type: number
 *                       description: Change in overdue tasks compared to the previous period.
 *                       example: 5
 *             cache:
 *               type: object
 *               properties:
 *                 hit:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                   example: false
 *                 key:
 *                   type: string
 *                   description: Cache key used for this request.
 *                   example: "overdue-trends:workspace:ADMIN:workspace-123:2025-01-01:2025-12-31"
 *                 ttl:
 *                   type: integer
 *                   description: Time-to-live (TTL) for the cached data in seconds.
 *                   example: 600
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the data generation.
 *               example: "2025-01-13T17:41:56.849Z"
 */

/**
 * @swagger
 * /api/dashboard/overdue-tasks-trend:
 *   get:
 *     summary: Get Overdue Tasks Trend for Landing Dashboard
 *     description: |
 *       Retrieves a trend analysis of overdue tasks across all workspaces accessible to the authenticated user.
 *       The data is aggregated by day, week, or month and includes totals, averages, and trend analysis.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation level for the trend data.
 *         example: "weekly"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved overdue tasks trend metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OverdueTasksTrendResponse'
 *       400:
 *         description: Invalid parameters (e.g., invalid view or date range).
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/overdue-tasks-trend", dashboardMiddleware("landing"), getOverdueTasksTrend)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/overdue-tasks-trend:
 *   get:
 *     summary: Get Overdue Tasks Trend for Workspace Dashboard
 *     description: |
 *       Retrieves a trend analysis of overdue tasks for a specific workspace.
 *       The data is aggregated by day, week, or month and includes totals, averages, and trend analysis.
 *       Access is restricted to users with permission to view the workspace.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to analyze.
 *         example: 123
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation level for the trend data.
 *         example: "weekly"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace-specific overdue tasks trend metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OverdueTasksTrendResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient workspace access.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/workspace/:workspaceId/overdue-tasks-trend", dashboardMiddleware("workspace"), getOverdueTasksTrend)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/overdue-tasks-trend:
 *   get:
 *     summary: Get Overdue Tasks Trend for Project Dashboard
 *     description: |
 *       Retrieves a trend analysis of overdue tasks for a specific project.
 *       The data is aggregated by day, week, or month and includes totals, averages, and trend analysis.
 *       Access is restricted to users with permission to view the project.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project.
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to analyze.
 *         example: 456
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation level for the trend data.
 *         example: "weekly"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved project-specific overdue tasks trend metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OverdueTasksTrendResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient project access.
 *       404:
 *         description: Project or workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/overdue-tasks-trend",
	dashboardMiddleware("project"),
	getOverdueTasksTrend
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/overdue-tasks-trend:
 *   get:
 *     summary: Get Overdue Tasks Trend for Profile Dashboard
 *     description: |
 *       Retrieves a trend analysis of overdue tasks for a specific user's profile.
 *       The data is aggregated by day, week, or month and includes totals, averages, and trend analysis.
 *       Users can view their own stats, while admins can access any profile's statistics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose task metrics are being analyzed.
 *         example: 789
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: daily
 *         description: Aggregation level for the trend data.
 *         example: "weekly"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved profile-specific overdue tasks trend metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OverdueTasksTrendResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/overdue-tasks-trend", dashboardMiddleware("profile"), getOverdueTasksTrend)

/**
 * @swagger
 * components:
 *   schemas:
 *     TaskStatusOverviewResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           additionalProperties:
 *             type: object
 *             properties:
 *               Todo:
 *                 type: number
 *                 description: Percentage of tasks in the "Todo" status for the month.
 *                 example: 25.5
 *               "In Progress":
 *                 type: number
 *                 description: Percentage of tasks in the "In Progress" status for the month.
 *                 example: 30.2
 *               Review:
 *                 type: number
 *                 description: Percentage of tasks in the "Review" status for the month.
 *                 example: 15.8
 *               Done:
 *                 type: number
 *                 description: Percentage of tasks in the "Done" status for the month.
 *                 example: 20.3
 *               Overdue:
 *                 type: number
 *                 description: Percentage of overdue tasks for the month.
 *                 example: 8.2
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   description: Start date of the data range.
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   description: End date of the data range.
 *                   example: "2025-12-31"
 *                 label:
 *                   type: string
 *                   description: Human-readable label for the date range.
 *                   example: "Last 12 months"
 *             context:
 *               type: object
 *               properties:
 *                 viewType:
 *                   type: string
 *                   enum: [landing, workspace, project, profile]
 *                   description: Type of dashboard view.
 *                   example: "workspace"
 *                 workspaceId:
 *                   type: integer
 *                   description: ID of the workspace (if applicable).
 *                   example: 123
 *                 projectId:
 *                   type: integer
 *                   description: ID of the project (if applicable).
 *                   example: 456
 *                 userId:
 *                   type: integer
 *                   description: ID of the user (if applicable).
 *                   example: 789
 *             summary:
 *               type: object
 *               properties:
 *                 totalTasks:
 *                   type: integer
 *                   description: Total number of tasks in the date range.
 *                   example: 684
 *                 statusDistribution:
 *                   type: object
 *                   additionalProperties:
 *                     type: number
 *                   description: Percentage distribution of tasks by status.
 *                   example:
 *                     Todo: 25.5
 *                     "In Progress": 30.2
 *                     Review: 15.8
 *                     Done: 20.3
 *                     Overdue: 8.2
 *                 periodCount:
 *                   type: integer
 *                   description: Number of periods (months) in the date range.
 *                   example: 12
 *             statuses:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of valid task statuses.
 *               example: ["Todo", "In Progress", "Review", "Done", "Overdue"]
 *             cache:
 *               type: object
 *               properties:
 *                 hit:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                   example: false
 *                 key:
 *                   type: string
 *                   description: Cache key used for this request.
 *                   example: "task-status-overview:workspace:ADMIN:workspace-123:2025-01-01:2025-12-31"
 *                 ttl:
 *                   type: integer
 *                   description: Time-to-live (TTL) for the cached data in seconds.
 *                   example: 600
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the data generation.
 *               example: "2025-01-13T17:41:56.849Z"
 */

/**
 * @swagger
 * /api/dashboard/task-status-overview:
 *   get:
 *     summary: Get Task Status Overview for Landing Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of task status distribution across all workspaces
 *       accessible to the authenticated user. The data includes percentages for each status
 *       (Todo, In Progress, Review, Done, Overdue) and summary statistics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved task status overview metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatusOverviewResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/task-status-overview", dashboardMiddleware("landing"), getTaskStatusOverview)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/task-status-overview:
 *   get:
 *     summary: Get Task Status Overview for Workspace Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of task status distribution for a specific workspace.
 *       The data includes percentages for each status (Todo, In Progress, Review, Done, Overdue)
 *       and summary statistics. Access is restricted to users with permission to view the workspace.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to analyze.
 *         example: 123
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace-specific task status overview metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatusOverviewResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient workspace access.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/workspace/:workspaceId/task-status-overview", dashboardMiddleware("workspace"), getTaskStatusOverview)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/task-status-overview:
 *   get:
 *     summary: Get Task Status Overview for Project Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of task status distribution for a specific project.
 *       The data includes percentages for each status (Todo, In Progress, Review, Done, Overdue)
 *       and summary statistics. Access is restricted to users with permission to view the project.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project.
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to analyze.
 *         example: 456
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved project-specific task status overview metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatusOverviewResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient project access.
 *       404:
 *         description: Project or workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/task-status-overview",
	dashboardMiddleware("project"),
	getTaskStatusOverview
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/task-status-overview:
 *   get:
 *     summary: Get Task Status Overview for Profile Dashboard
 *     description: |
 *       Retrieves a monthly breakdown of task status distribution for a specific user's profile.
 *       The data includes percentages for each status (Todo, In Progress, Review, Done, Overdue)
 *       and summary statistics. Users can view their own stats, while admins can access any profile's statistics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose task metrics are being analyzed.
 *         example: 789
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-12-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastYear"
 *     responses:
 *       200:
 *         description: Successfully retrieved profile-specific task status overview metrics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatusOverviewResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/task-status-overview", dashboardMiddleware("profile"), getTaskStatusOverview)

/**
 * @swagger
 * components:
 *   schemas:
 *     TaskStatisticsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 description: Task status (e.g., "Done", "In Progress").
 *                 example: "Done"
 *               overall:
 *                 type: object
 *                 properties:
 *                   count:
 *                     type: integer
 *                     description: Total number of tasks in this status.
 *                     example: 150
 *                   percentage:
 *                     type: number
 *                     format: float
 *                     description: Percentage of tasks in this status.
 *                     example: 65.8
 *               period:
 *                 type: object
 *                 properties:
 *                   count:
 *                     type: integer
 *                     description: Number of tasks in this status for the specified period.
 *                     example: 25
 *                   percentage:
 *                     type: number
 *                     format: float
 *                     description: Percentage of tasks in this status for the specified period.
 *                     example: 45.2
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   description: Start date of the data range.
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   description: End date of the data range.
 *                   example: "2025-01-31"
 *                 label:
 *                   type: string
 *                   description: Human-readable label for the date range.
 *                   example: "Last Month"
 *             summary:
 *               type: object
 *               properties:
 *                 overall:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total tasks across all statuses.
 *                       example: 400
 *                 period:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total tasks in the specified period.
 *                       example: 50
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the data generation.
 *               example: "2025-01-08T16:20:46.742Z"
 */

/**
 * @swagger
 * /api/dashboard/task-statistics:
 *   get:
 *     summary: Get Task Statistics for Landing Dashboard
 *     description: |
 *       Fetches task statistics for the landing dashboard, showing overall and period-specific metrics.
 *       The data is scoped to tasks across all workspaces accessible to the authenticated user.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         default: allTime
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved task statistics for the landing dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatisticsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/task-statistics", dashboardMiddleware("landing"), getTaskStatistics)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/task-statistics:
 *   get:
 *     summary: Get Task Statistics for Workspace Dashboard
 *     description: |
 *       Fetches task statistics for a specific workspace, showing overall and period-specific metrics.
 *       The data is scoped to tasks within the specified workspace.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to fetch statistics for.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         default: allTime
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved task statistics for the workspace dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatisticsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Access denied to the workspace.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/workspace/:workspaceId/task-statistics", dashboardMiddleware("workspace"), getTaskStatistics)

/**
 * @swagger
 * /api/dashboard/workspace/:workspaceId/project/:projectId/task-statistics:
 *   get:
 *     summary: Get Task Statistics for Project Dashboard
 *     description: |
 *       Fetches task statistics for a specific project, showing overall and period-specific metrics.
 *       The data is scoped to tasks within the specified project.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to fetch statistics for.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         default: allTime
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved task statistics for the project dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatisticsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Access denied to the project.
 *       404:
 *         description: Project not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/task-statistics",
	dashboardMiddleware("project"),
	getTaskStatistics
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/task-statistics:
 *   get:
 *     summary: Get Task Statistics for Profile Dashboard
 *     description: |
 *       Fetches task statistics for a specific user's profile, showing overall and period-specific metrics.
 *       The data is scoped to tasks assigned to the specified user.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user to fetch statistics for.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         default: allTime
 *         description: Predefined date ranges.
 *     responses:
 *       200:
 *         description: Successfully retrieved task statistics for the profile dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatisticsResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view this profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/task-statistics", dashboardMiddleware("profile"), getTaskStatistics)

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectCompletionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             overall:
 *               type: object
 *               properties:
 *                 totalTasks:
 *                   type: integer
 *                   description: Total number of tasks.
 *                   example: 100
 *                 completedTasks:
 *                   type: integer
 *                   description: Number of completed tasks.
 *                   example: 75
 *                 completionPercentage:
 *                   type: number
 *                   format: float
 *                   description: Percentage of tasks completed.
 *                   example: 75.0
 *             period:
 *               type: object
 *               properties:
 *                 totalTasks:
 *                   type: integer
 *                   description: Total number of tasks in the specified period.
 *                   example: 50
 *                 completedTasks:
 *                   type: integer
 *                   description: Number of tasks completed in the specified period.
 *                   example: 30
 *                 completionPercentage:
 *                   type: number
 *                   format: float
 *                   description: Percentage of tasks completed in the specified period.
 *                   example: 60.0
 *                 tasksCompletedInPeriod:
 *                   type: integer
 *                   description: Number of tasks completed within the specified period.
 *                   example: 30
 *                 completionMetrics:
 *                   type: object
 *                   properties:
 *                     daysInPeriod:
 *                       type: integer
 *                       description: Number of days in the specified period.
 *                       example: 30
 *                     averageCompletionsPerDay:
 *                       type: number
 *                       format: float
 *                       description: Average number of tasks completed per day.
 *                       example: 1.0
 *                     completionVelocity:
 *                       type: number
 *                       format: float
 *                       description: Percentage of tasks completed relative to the total tasks in the period.
 *                       example: 60.0
 *         _meta:
 *           type: object
 *           properties:
 *             dateRange:
 *               type: object
 *               properties:
 *                 startDate:
 *                   type: string
 *                   format: date
 *                   description: Start date of the data range.
 *                   example: "2025-01-01"
 *                 endDate:
 *                   type: string
 *                   format: date
 *                   description: End date of the data range.
 *                   example: "2025-01-31"
 *                 label:
 *                   type: string
 *                   description: Human-readable label for the date range.
 *                   example: "Last Month"
 *             context:
 *               type: object
 *               properties:
 *                 viewType:
 *                   type: string
 *                   enum: [landing, workspace, project, profile]
 *                   description: Type of dashboard view.
 *                   example: "workspace"
 *                 workspaceId:
 *                   type: integer
 *                   description: ID of the workspace (if applicable).
 *                   example: 123
 *                 projectId:
 *                   type: integer
 *                   description: ID of the project (if applicable).
 *                   example: 456
 *                 userId:
 *                   type: integer
 *                   description: ID of the user (if applicable).
 *                   example: 789
 *             cache:
 *               type: object
 *               properties:
 *                 hit:
 *                   type: boolean
 *                   description: Indicates if the data was served from cache.
 *                   example: false
 *                 key:
 *                   type: string
 *                   description: Cache key used for this request.
 *                   example: "project-completion:workspace:ADMIN:workspace-123:2025-01-01:2025-01-31"
 *                 ttl:
 *                   type: integer
 *                   description: Time-to-live (TTL) for the cached data in seconds.
 *                   example: 600
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Timestamp of the data generation.
 *               example: "2025-01-13T17:41:56.849Z"
 */

/**
 * @swagger
 * /api/dashboard/project-completion:
 *   get:
 *     summary: Get Project Completion Metrics for Landing Dashboard
 *     description: |
 *       Retrieves project completion metrics across all workspaces accessible to the authenticated user.
 *       The data includes overall and period-specific completion percentages, task counts, and velocity metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-01-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastMonth"
 *     responses:
 *       200:
 *         description: Successfully retrieved project completion metrics for the landing dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectCompletionResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       500:
 *         description: Internal server error.
 */
router.get("/project-completion", dashboardMiddleware("landing"), getProjectCompletionPercentage)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project-completion:
 *   get:
 *     summary: Get Project Completion Metrics for Workspace Dashboard
 *     description: |
 *       Retrieves project completion metrics for a specific workspace.
 *       The data includes overall and period-specific completion percentages, task counts, and velocity metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to analyze.
 *         example: 123
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-01-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastMonth"
 *     responses:
 *       200:
 *         description: Successfully retrieved project completion metrics for the workspace dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectCompletionResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient workspace access.
 *       404:
 *         description: Workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspace/:workspaceId/project-completion",
	dashboardMiddleware("workspace"),
	getProjectCompletionPercentage
)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/project-completion:
 *   get:
 *     summary: Get Project Completion Metrics for Project Dashboard
 *     description: |
 *       Retrieves project completion metrics for a specific project.
 *       The data includes overall and period-specific completion percentages, task counts, and velocity metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace containing the project.
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to analyze.
 *         example: 456
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-01-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastMonth"
 *     responses:
 *       200:
 *         description: Successfully retrieved project completion metrics for the project dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectCompletionResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient project access.
 *       404:
 *         description: Project or workspace not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/project-completion",
	dashboardMiddleware("project"),
	getProjectCompletionPercentage
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/project-completion:
 *   get:
 *     summary: Get Project Completion Metrics for Profile Dashboard
 *     description: |
 *       Retrieves project completion metrics for tasks assigned to a specific user.
 *       The data includes overall and period-specific completion percentages, task counts, and velocity metrics.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user whose task metrics are being analyzed.
 *         example: 789
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom range (YYYY-MM-DD).
 *         example: "2025-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom range (YYYY-MM-DD).
 *         example: "2025-01-31"
 *       - in: query
 *         name: preset
 *         schema:
 *           type: string
 *           enum: [lastMonth, lastQuarter, lastYear, allTime]
 *         description: Predefined date range presets.
 *         example: "lastMonth"
 *     responses:
 *       200:
 *         description: Successfully retrieved project completion metrics for the profile dashboard.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectCompletionResponse'
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *       403:
 *         description: Forbidden - Insufficient permissions to view profile.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/profile/:userId/project-completion", dashboardMiddleware("profile"), getProjectCompletionPercentage)

/**
 * @swagger
 * /api/dashboard/recent-tasks:
 *   get:
 *     summary: Retrieve recent tasks for the landing view
 *     description: |
 *       Fetch recent tasks from the landing dashboard. This endpoint provides a general overview of tasks with advanced filter options, sorting, and pagination.
 *       Results are cached using Redis to enhance performance and reduce response times.
 *
 *       **Key Features:**
 *       - Supports advanced filtering by task status, priority, department, and more.
 *       - Cursor-based pagination for efficient handling of large datasets.
 *       - Role-based access control ensures users only see permitted data.
 *
 *       **Edge Cases:**
 *       - Returns an empty list if no tasks are available for the current context.
 *       - Handles missing or invalid parameters gracefully with descriptive errors.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [Late Completed, Late Started, Expired Tasks, Overdue Tasks]
 *         description: Filter tasks by alert type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *         description: Filter tasks by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [URGENT, HIGH, MEDIUM, LOW]
 *         description: Filter tasks by priority level
 *       - in: query
 *         name: department
 *         schema:
 *           type: integer
 *         description: Filter tasks by department ID
 *       - in: query
 *         name: role
 *         schema:
 *           type: integer
 *         description: Filter tasks by department role ID (requires department filter)
 *       - in: query
 *         name: project
 *         schema:
 *           type: integer
 *         description: Filter tasks by project ID
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *         description: Filter tasks by tag ID
 *       - in: query
 *         name: timing
 *         schema:
 *           type: string
 *           enum: [Ready Tasks, No Assigned Tasks]
 *         description: Filter tasks by timing conditions. Ready Tasks = TODO tasks with start date <= current date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in task title
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, lastUpdated, dueDate, priority, status]
 *           default: newest
 *         description: Sort tasks by the specified field
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved recent tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       title:
 *                         type: string
 *                         example: Complete migration
 *                       description:
 *                         type: string
 *                       due_date:
 *                         type: string
 *                         format: date-time
 *                       start_date:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       is_expired:
 *                         type: boolean
 *                       late_start_status:
 *                         type: boolean
 *                       status:
 *                         type: string
 *                         enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *                       priority:
 *                         type: string
 *                         enum: [URGENT, HIGH, MEDIUM, LOW]
 *                       project_name:
 *                         type: string
 *                       workspace_name:
 *                         type: string
 *                       is_assigned_to_me:
 *                         type: boolean
 *                       assigned_users:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             username:
 *                               type: string
 *                             name:
 *                               type: string
 *                             role:
 *                               type: string
 *                             department:
 *                               type: string
 *                             avatar:
 *                               type: string
 *                       subtasks_info:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: integer
 *                             example: 5
 *                           completed:
 *                             type: integer
 *                             example: 3
 *                           completion_percentage:
 *                             type: number
 *                             example: 60.00
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                         userRole:
 *                           type: string
 *                     filters:
 *                       type: object
 *                       properties:
 *                         appliedFilters:
 *                           type: object
 *                           properties:
 *                             filter:
 *                               type: string
 *                             status:
 *                               type: string
 *                             priority:
 *                               type: string
 *                             project:
 *                               type: integer
 *                             department:
 *                               type: integer
 *                             role:
 *                               type: integer
 *                             tagId:
 *                               type: integer
 *                             timing:
 *                               type: string
 *                         search:
 *                           type: string
 *                         sort:
 *                           type: string
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         ttl:
 *                           type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid query parameter
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: An unexpected error occurred
 */
router.get("/recent-tasks", dashboardMiddleware("landing"), getRecentTasks)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/recent-tasks:
 *   get:
 *     summary: Retrieve recent tasks for a specific workspace
 *     description: |
 *       Fetch recent tasks within a workspace context. Users can filter tasks based on advanced criteria and view details specific to the selected workspace.
 *       The results are cached using Redis for optimized response times.
 *
 *       **Key Features:**
 *       - Filters tasks based on workspace-specific data.
 *       - Role-based access control ensures workspace members see appropriate tasks.
 *       - Advanced filtering with department, role, and tag-based filters.
 *       - Supports task timing and assignment filters.
 *
 *       **Edge Cases:**
 *       - Returns 404 if the workspace is invalid or not found.
 *       - Returns an empty list if no tasks exist for the selected workspace.
 *       - Returns 403 if user doesn't have workspace access.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the workspace
 *         example: 101
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [Late Completed, Late Started, Expired Tasks, Overdue Tasks]
 *         description: Filter tasks by alert type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *         description: Filter tasks by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [URGENT, HIGH, MEDIUM, LOW]
 *         description: Filter tasks by priority level
 *       - in: query
 *         name: department
 *         schema:
 *           type: integer
 *         description: Filter tasks by department ID. Shows tasks where assigned users belong to the specified department
 *       - in: query
 *         name: role
 *         schema:
 *           type: integer
 *         description: Filter tasks by department role ID (requires department filter). Shows tasks assigned to users with specific roles
 *       - in: query
 *         name: project
 *         schema:
 *           type: integer
 *         description: Filter tasks by project ID within the workspace
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *         description: Filter tasks by tag ID
 *       - in: query
 *         name: timing
 *         schema:
 *           type: string
 *           enum: [Ready Tasks, No Assigned Tasks]
 *         description: |
 *           Filter tasks by timing conditions:
 *           * Ready Tasks = TODO tasks with start date <= current date
 *           * No Assigned Tasks = Tasks without any assignments
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in task title
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, lastUpdated, dueDate, priority, status]
 *           default: newest
 *         description: Sort tasks by the specified field
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       title:
 *                         type: string
 *                         example: Implement feature X
 *                       description:
 *                         type: string
 *                       due_date:
 *                         type: string
 *                         format: date-time
 *                       start_date:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       is_expired:
 *                         type: boolean
 *                         description: Indicates if the task has expired
 *                       late_start_status:
 *                         type: boolean
 *                         description: Indicates if the task was started late
 *                       status:
 *                         type: string
 *                         enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *                       priority:
 *                         type: string
 *                         enum: [URGENT, HIGH, MEDIUM, LOW]
 *                       project_name:
 *                         type: string
 *                       workspace_name:
 *                         type: string
 *                       is_assigned_to_me:
 *                         type: boolean
 *                         description: Indicates if the task is assigned to the current user
 *                       assigned_users:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             username:
 *                               type: string
 *                             name:
 *                               type: string
 *                             role:
 *                               type: string
 *                             department:
 *                               type: string
 *                             avatar:
 *                               type: string
 *                       subtasks_info:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: integer
 *                             description: Total number of subtasks
 *                             example: 5
 *                           completed:
 *                             type: integer
 *                             description: Number of completed subtasks
 *                             example: 3
 *                           completion_percentage:
 *                             type: number
 *                             description: Percentage of completed subtasks
 *                             example: 60.00
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: workspace
 *                         userRole:
 *                           type: string
 *                         workspaceId:
 *                           type: integer
 *                     filters:
 *                       type: object
 *                       properties:
 *                         appliedFilters:
 *                           type: object
 *                           properties:
 *                             filter:
 *                               type: string
 *                             status:
 *                               type: string
 *                             priority:
 *                               type: string
 *                             project:
 *                               type: integer
 *                             department:
 *                               type: integer
 *                             role:
 *                               type: integer
 *                             tagId:
 *                               type: integer
 *                             timing:
 *                               type: string
 *                         search:
 *                           type: string
 *                         sort:
 *                           type: string
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         ttl:
 *                           type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid workspace ID or query parameters
 *       403:
 *         description: Insufficient workspace access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Insufficient permissions to access workspace tasks
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Workspace not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: An unexpected error occurred
 */
router.get("/workspace/:workspaceId/recent-tasks", dashboardMiddleware("workspace"), getRecentTasks)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/recent-tasks:
 *   get:
 *     summary: Retrieve recent tasks for a specific project
 *     description: |
 *       Fetch recent tasks within a specific project context. This endpoint allows detailed filtering and sorting within the boundaries of a specific project.
 *       Data is cached for enhanced performance and reduced database queries.
 *
 *       **Key Features:**
 *       - Project-specific task filtering and access control
 *       - Inherits workspace-level permissions
 *       - Supports department and role-based filtering
 *       - Advanced tag and timing-based filters
 *
 *       **Edge Cases:**
 *       - Returns 404 if project or workspace is not found
 *       - Returns 403 if user lacks project access permissions
 *       - Returns empty list for valid project without tasks
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: workspaceId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the parent workspace
 *         example: 101
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the project
 *         example: 202
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [Late Completed, Late Started, Expired Tasks, Overdue Tasks]
 *         description: |
 *           Filter tasks by alert type:
 *           * Late Completed = Tasks completed after due date
 *           * Late Started = Tasks started after scheduled start date
 *           * Expired Tasks = Tasks past final deadline
 *           * Overdue Tasks = Uncompleted tasks past due date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *         description: Filter tasks by their current status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [URGENT, HIGH, MEDIUM, LOW]
 *         description: Filter tasks by priority level
 *       - in: query
 *         name: department
 *         schema:
 *           type: integer
 *         description: Filter tasks by assigned users' department ID
 *       - in: query
 *         name: role
 *         schema:
 *           type: integer
 *         description: Filter tasks by department role ID (requires department parameter)
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *         description: Filter tasks by associated tag ID
 *       - in: query
 *         name: timing
 *         schema:
 *           type: string
 *           enum: [Ready Tasks, No Assigned Tasks]
 *         description: |
 *           Special timing-based filters:
 *           * Ready Tasks = TODO tasks with start date <= current date
 *           * No Assigned Tasks = Tasks without any assigned users
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in task title
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, lastUpdated, dueDate, priority, status]
 *           default: newest
 *         description: |
 *           Sort tasks by specified criteria:
 *           * newest/oldest = by creation date
 *           * lastUpdated = by last modification
 *           * dueDate = by task deadline
 *           * priority = by task priority (URGENT to LOW)
 *           * status = by task status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved project tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       title:
 *                         type: string
 *                         example: Implement API endpoints
 *                       description:
 *                         type: string
 *                       due_date:
 *                         type: string
 *                         format: date-time
 *                       start_date:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       is_expired:
 *                         type: boolean
 *                         description: Indicates if task has passed final deadline
 *                       late_start_status:
 *                         type: boolean
 *                         description: Indicates if task started after scheduled date
 *                       status:
 *                         type: string
 *                         enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *                       priority:
 *                         type: string
 *                         enum: [URGENT, HIGH, MEDIUM, LOW]
 *                       project_name:
 *                         type: string
 *                       workspace_name:
 *                         type: string
 *                       is_assigned_to_me:
 *                         type: boolean
 *                         description: Indicates if task is assigned to current user
 *                       assigned_users:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             username:
 *                               type: string
 *                             name:
 *                               type: string
 *                             role:
 *                               type: string
 *                               description: Department role name
 *                             department:
 *                               type: string
 *                               description: Department name
 *                             avatar:
 *                               type: string
 *                               description: User's profile picture URL
 *                       subtasks_info:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: integer
 *                             description: Total number of subtasks
 *                             example: 5
 *                           completed:
 *                             type: integer
 *                             description: Number of completed subtasks
 *                             example: 3
 *                           completion_percentage:
 *                             type: number
 *                             description: Percentage of completed subtasks
 *                             example: 60.00
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: project
 *                         userRole:
 *                           type: string
 *                         workspaceId:
 *                           type: integer
 *                         projectId:
 *                           type: integer
 *                     filters:
 *                       type: object
 *                       properties:
 *                         appliedFilters:
 *                           type: object
 *                           properties:
 *                             filter:
 *                               type: string
 *                             status:
 *                               type: string
 *                             priority:
 *                               type: string
 *                             department:
 *                               type: integer
 *                             role:
 *                               type: integer
 *                             tagId:
 *                               type: integer
 *                             timing:
 *                               type: string
 *                         search:
 *                           type: string
 *                         sort:
 *                           type: string
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         ttl:
 *                           type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid project ID or query parameters
 *       403:
 *         description: Insufficient project access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Insufficient permissions to access project tasks
 *       404:
 *         description: Project or workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Project or workspace not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: An unexpected error occurred
 */
router.get("/workspace/:workspaceId/project/:projectId/recent-tasks", dashboardMiddleware("project"), getRecentTasks)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/recent-tasks:
 *   get:
 *     summary: Retrieve recent tasks for a specific user profile
 *     description: |
 *       Fetch recent tasks specific to a user profile. This endpoint allows users to view their tasks or tasks assigned to a particular profile, depending on permissions.
 *       Results are cached for optimal performance and faster responses.
 *
 *       **Key Features:**
 *       - Fetches tasks assigned to or associated with the specific user
 *       - Special permission checks for viewing other users' tasks
 *       - Department and role-based filtering of tasks
 *       - Advanced filtering with tags and timing conditions
 *
 *       **Edge Cases:**
 *       - Returns 403 if user lacks permission to view the profile's tasks
 *       - Returns 404 if user profile not found
 *       - Special handling for self-view vs viewing others
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique identifier of the user whose tasks are being retrieved
 *         example: 303
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [Late Completed, Late Started, Expired Tasks, Overdue Tasks]
 *         description: |
 *           Filter tasks by alert type:
 *           * Late Completed = Tasks completed after their due date
 *           * Late Started = Tasks started after scheduled start date
 *           * Expired Tasks = Tasks past their final deadline
 *           * Overdue Tasks = Uncompleted tasks past due date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *         description: Filter tasks by their current status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [URGENT, HIGH, MEDIUM, LOW]
 *         description: Filter tasks by priority level
 *       - in: query
 *         name: department
 *         schema:
 *           type: integer
 *         description: Filter tasks by department ID of collaborators
 *       - in: query
 *         name: role
 *         schema:
 *           type: integer
 *         description: Filter tasks by department role ID (requires department parameter)
 *       - in: query
 *         name: project
 *         schema:
 *           type: integer
 *         description: Filter tasks by specific project ID
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *         description: Filter tasks by associated tag ID
 *       - in: query
 *         name: timing
 *         schema:
 *           type: string
 *           enum: [Ready Tasks, No Assigned Tasks]
 *         description: |
 *           Special timing-based filters:
 *           * Ready Tasks = TODO tasks with start date <= current date
 *           * No Assigned Tasks = Tasks without any assigned users
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in task title
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, lastUpdated, dueDate, priority, status]
 *           default: newest
 *         description: |
 *           Sort tasks by specified criteria:
 *           * newest/oldest = by creation date
 *           * lastUpdated = by last modification
 *           * dueDate = by task deadline
 *           * priority = by task priority (URGENT to LOW)
 *           * status = by task status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved profile tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       title:
 *                         type: string
 *                         example: Complete user dashboard
 *                       description:
 *                         type: string
 *                       due_date:
 *                         type: string
 *                         format: date-time
 *                       start_date:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                       is_expired:
 *                         type: boolean
 *                         description: Indicates if task has passed final deadline
 *                       late_start_status:
 *                         type: boolean
 *                         description: Indicates if task was started late
 *                       status:
 *                         type: string
 *                         enum: [TODO, IN PROGRESS, IN REVIEW, DONE]
 *                       priority:
 *                         type: string
 *                         enum: [URGENT, HIGH, MEDIUM, LOW]
 *                       project_name:
 *                         type: string
 *                         description: Name of the project containing this task
 *                       workspace_name:
 *                         type: string
 *                         description: Name of the workspace containing this task
 *                       is_assigned_to_me:
 *                         type: boolean
 *                         description: True if task is assigned to the viewing user
 *                       assigned_users:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             username:
 *                               type: string
 *                             name:
 *                               type: string
 *                             role:
 *                               type: string
 *                               description: Department role name
 *                             department:
 *                               type: string
 *                               description: Department name
 *                             avatar:
 *                               type: string
 *                               description: User's profile picture URL
 *                       subtasks_info:
 *                         type: object
 *                         properties:
 *                           total:
 *                             type: integer
 *                             description: Total number of subtasks
 *                             example: 5
 *                           completed:
 *                             type: integer
 *                             description: Number of completed subtasks
 *                             example: 3
 *                           completion_percentage:
 *                             type: number
 *                             description: Percentage of completed subtasks
 *                             example: 60.00
 *                       tags:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 50
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: profile
 *                         userRole:
 *                           type: string
 *                         profileId:
 *                           type: integer
 *                     filters:
 *                       type: object
 *                       properties:
 *                         appliedFilters:
 *                           type: object
 *                           properties:
 *                             filter:
 *                               type: string
 *                             status:
 *                               type: string
 *                             priority:
 *                               type: string
 *                             project:
 *                               type: integer
 *                             department:
 *                               type: integer
 *                             role:
 *                               type: integer
 *                             tagId:
 *                               type: integer
 *                             timing:
 *                               type: string
 *                         search:
 *                           type: string
 *                         sort:
 *                           type: string
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         ttl:
 *                           type: integer
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid user ID or query parameters
 *       403:
 *         description: Insufficient permissions to view profile tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Insufficient permissions to view this profile's tasks
 *       404:
 *         description: User profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: User profile not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: An unexpected error occurred
 */
router.get("/profile/:userId/recent-tasks", dashboardMiddleware("profile"), getRecentTasks)

/**
 * @swagger
 * /api/dashboard/search-projects:
 *   get:
 *     summary: Search projects across the system with cursor-based pagination
 *     description: |
 *       Provides a search functionality for projects with context-aware results based on user permissions.
 *       Results are cached using Redis for improved performance.
 *
 *       **Key Features:**
 *       - Cursor-based pagination for efficient large dataset handling
 *       - Role-based access control
 *       - Cached results with context-specific TTLs
 *       - Returns project summary including task and member counts
 *
 *       **Edge Cases:**
 *       - Returns empty array if no matching projects found
 *       - Cursor becomes null when no more results available
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter projects by title
 *         example: "Marketing"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 123
 *                       title:
 *                         type: string
 *                         example: "Marketing Campaign 2024"
 *                       workspace_name:
 *                         type: string
 *                         example: "Marketing Department"
 *                       task_count:
 *                         type: integer
 *                         example: 15
 *                       member_count:
 *                         type: integer
 *                         example: 5
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     title:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "landing"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                           example: false
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid context"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search projects"
 */
router.get("/search-projects", dashboardMiddleware("landing"), searchProjects)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/search-projects:
 *   get:
 *     summary: Search projects within a specific workspace
 *     description: |
 *       Provides a search functionality for projects within a specified workspace context.
 *       Results are cached using Redis for improved performance and filtered based on workspace membership.
 *
 *       **Key Features:**
 *       - Workspace-specific project search
 *       - Cursor-based pagination
 *       - Role-based access within workspace context
 *       - Returns project summary with task and member counts
 *
 *       **Edge Cases:**
 *       - Returns 403 if user lacks workspace access
 *       - Returns 404 if workspace not found
 *       - Empty array if no matching projects in workspace
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to search within
 *         example: 123
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter projects by title
 *         example: "Website"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 456
 *                       title:
 *                         type: string
 *                         example: "Website Redesign"
 *                       workspace_name:
 *                         type: string
 *                         example: "Design Team"
 *                       task_count:
 *                         type: integer
 *                         example: 8
 *                       member_count:
 *                         type: integer
 *                         example: 3
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     title:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "workspace"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                           example: false
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid workspace ID or context"
 *       403:
 *         description: Insufficient workspace access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access workspace"
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Workspace not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search workspace projects"
 */
router.get("/workspace/:workspaceId/search-projects", dashboardMiddleware("workspace"), searchProjects)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/search-projects:
 *   get:
 *     summary: Search projects within a project context
 *     description: |
 *       Provides a search functionality for projects while in a project view context.
 *       Results are cached using Redis and filtered based on project and workspace membership.
 *
 *       **Key Features:**
 *       - Project context-aware search
 *       - Inherits workspace permissions
 *       - Cursor-based pagination
 *       - Returns project summary with associated metrics
 *
 *       **Edge Cases:**
 *       - Returns 403 if user lacks project access
 *       - Returns 404 if project or workspace not found
 *       - Handles nested permission hierarchy
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the parent workspace
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the current project context
 *         example: 456
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter projects by title
 *         example: "Mobile App"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 789
 *                       title:
 *                         type: string
 *                         example: "Mobile App Development"
 *                       workspace_name:
 *                         type: string
 *                         example: "Development Team"
 *                       task_count:
 *                         type: integer
 *                         example: 12
 *                       member_count:
 *                         type: integer
 *                         example: 4
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     title:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "project"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                         projectId:
 *                           type: integer
 *                           example: 456
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                           example: false
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid project ID or workspace ID"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access project"
 *       404:
 *         description: Project or workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project or workspace not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search projects"
 */
router.get("/workspace/:workspaceId/project/:projectId/search-projects", dashboardMiddleware("project"), searchProjects)

/**
 * @swagger
 * /api/dashboard/search-tags:
 *   get:
 *     summary: Search task tags with context-aware filtering
 *     description: |
 *       Provides a search functionality for task tags in the landing context.
 *       Results are filtered based on user permissions and task assignments.
 *
 *       **Key Features:**
 *       - Context-aware tag search
 *       - Role-based access control
 *       - Task count statistics per tag
 *       - Cursor-based pagination
 *       - Redis caching for performance
 *
 *       **Edge Cases:**
 *       - Returns empty array if no tags match criteria
 *       - Returns null cursor when no more results available
 *       - Filters based on user's task assignments for non-admin users
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter tags by name
 *         example: "urgent"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "urgent"
 *                       task_count:
 *                         type: integer
 *                         description: Number of accessible tasks using this tag
 *                         example: 5
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "landing"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters or context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid context"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search tags"
 */
router.get("/profile/:userId/search-projects", dashboardMiddleware("profile"), searchProjects)

/**
 * @swagger
 * /search-tags:
 *   get:
 *     summary: Search task tags with context-aware filtering
 *     description: |
 *       Provides a search functionality for task tags in the landing context.
 *       Results are filtered based on user permissions and task assignments.
 *
 *       **Key Features:**
 *       - Context-aware tag search
 *       - Role-based access control
 *       - Task count statistics per tag
 *       - Cursor-based pagination
 *       - Redis caching for performance
 *
 *       **Edge Cases:**
 *       - Returns empty array if no tags match criteria
 *       - Returns null cursor when no more results available
 *       - Filters based on user's task assignments for non-admin users
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter tags by name
 *         example: "urgent"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "urgent"
 *                       task_count:
 *                         type: integer
 *                         description: Number of accessible tasks using this tag
 *                         example: 5
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "landing"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters or context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid context"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search tags"
 */
router.get("/search-tags", dashboardMiddleware("landing"), searchTags)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/search-tags:
 *   get:
 *     summary: Search task tags within a specific workspace
 *     description: |
 *       Provides a search functionality for task tags within a workspace context.
 *       Results are filtered based on workspace membership and task assignments.
 *
 *       **Key Features:**
 *       - Workspace-specific tag search
 *       - Shows tags only from tasks within the workspace
 *       - Cursor-based pagination for efficient retrieval
 *       - Results cached with workspace-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 403 if user lacks workspace access
 *       - Returns 404 if workspace not found
 *       - Empty array if no tags match within workspace
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to search tags within
 *         example: 123
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter tags by name
 *         example: "priority"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "high-priority"
 *                       task_count:
 *                         type: integer
 *                         description: Number of tasks in workspace using this tag
 *                         example: 3
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "workspace"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid workspace ID or search parameters"
 *       403:
 *         description: Insufficient workspace access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access workspace"
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Workspace not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search workspace tags"
 */
router.get("/workspace/:workspaceId/search-tags", dashboardMiddleware("workspace"), searchTags)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/search-tags:
 *   get:
 *     summary: Search task tags within a specific project
 *     description: |
 *       Provides a search functionality for task tags within a project context.
 *       Results are filtered to only show tags used in tasks within the specified project.
 *
 *       **Key Features:**
 *       - Project-specific tag search
 *       - Inherits workspace access control
 *       - Shows only tags from tasks within the project
 *       - Cursor-based pagination
 *       - Results cached with project-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 403 if user lacks project/workspace access
 *       - Returns 404 if project or workspace not found
 *       - Empty array if no tags match within project
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the parent workspace
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to search tags within
 *         example: 456
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter tags by name
 *         example: "feature"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved project tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "new-feature"
 *                       task_count:
 *                         type: integer
 *                         description: Number of tasks in project using this tag
 *                         example: 4
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "project"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                         projectId:
 *                           type: integer
 *                           example: 456
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid project ID or workspace ID"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access project"
 *       404:
 *         description: Project or workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project or workspace not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search project tags"
 */
router.get("/workspace/:workspaceId/project/:projectId/search-tags", dashboardMiddleware("project"), searchTags)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/search-tags:
 *   get:
 *     summary: Search task tags associated with a user profile
 *     description: |
 *       Provides a search functionality for task tags associated with a specific user's tasks.
 *       Results are filtered based on user permissions and task assignments.
 *
 *       **Key Features:**
 *       - Profile-specific tag search
 *       - Shows tags only from tasks assigned to the user
 *       - Special permission handling for viewing other profiles
 *       - Cursor-based pagination
 *       - Results cached with profile-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 403 if viewer lacks permission to see profile's tasks
 *       - Returns 404 if user profile not found
 *       - Empty array if no matching tags in user's tasks
 *       - Special handling for self vs. other profile views
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user profile to search tags for
 *         example: 789
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter tags by name
 *         example: "bug"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved profile tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "bug-fix"
 *                       task_count:
 *                         type: integer
 *                         description: Number of user's tasks using this tag
 *                         example: 2
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "profile"
 *                         profileId:
 *                           type: integer
 *                           example: 789
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid user ID or search parameters"
 *       403:
 *         description: Insufficient permissions to view profile tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to view this profile's tasks"
 *       404:
 *         description: User profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User profile not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search profile tags"
 */
router.get("/profile/:userId/search-tags", dashboardMiddleware("profile"), searchTags)

/**
 * @swagger
 * /api/dashboard/search-departments:
 *   get:
 *     summary: Search departments in dashboard landing view
 *     description: |
 *       Provides search functionality for departments in the dashboard landing view.
 *       Returns departments of users who are members of projects within workspaces owned by the requesting user.
 *
 *       **Key Features:**
 *       - Department search specific to owned workspaces
 *       - Returns departments of users who are:
 *         * Members of projects
 *         * Within workspaces where requesting user is an OWNER
 *       - Includes department statistics and roles information
 *       - Cursor-based pagination
 *
 *       **Access Control:**
 *       - Admin users: see all departments
 *       - Non-admin users: see only departments of users from projects in their owned workspaces
 *
 *       **Note:** This endpoint specifically filters departments based on workspace ownership,
 *       not management or other roles.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter departments by name
 *         example: "Engineering"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Engineering Department"
 *                       user_count:
 *                         type: integer
 *                         description: Number of department users in owned workspace projects
 *                         example: 15
 *                       task_count:
 *                         type: integer
 *                         description: Number of tasks assigned to department members in owned workspace projects
 *                         example: 45
 *                       roles:
 *                         type: array
 *                         description: List of roles in the department
 *                         items:
 *                           type: string
 *                         example: ["Team Lead", "Senior Engineer", "Junior Engineer"]
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "landing"
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters or context
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid context"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search departments"
 */
router.get("/search-departments", dashboardMiddleware("landing"), searchDepartments)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/search-departments:
 *   get:
 *     summary: Search departments within a workspace context
 *     description: |
 *       Provides a search functionality for departments whose members are part of the specified workspace.
 *       Results are filtered based on workspace membership and user permissions.
 *
 *       **Key Features:**
 *       - Workspace-specific department search
 *       - Shows departments with members in workspace projects
 *       - Includes department statistics and role information
 *       - Cursor-based pagination
 *       - Results cached with workspace-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 403 if user lacks workspace access
 *       - Returns 404 if workspace not found
 *       - Empty array if no departments match criteria
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace to search departments within
 *         example: 123
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter departments by name
 *         example: "Engineering"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Engineering"
 *                       user_count:
 *                         type: integer
 *                         description: Number of users in this department within the workspace
 *                         example: 15
 *                       task_count:
 *                         type: integer
 *                         description: Number of tasks assigned to department members in workspace
 *                         example: 45
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of roles within this department
 *                         example: ["Senior Developer", "Team Lead", "Junior Developer"]
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "workspace"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid workspace ID or search parameters"
 *       403:
 *         description: Insufficient workspace access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access workspace"
 *       404:
 *         description: Workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Workspace not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search workspace departments"
 */
router.get("/workspace/:workspaceId/search-departments", dashboardMiddleware("workspace"), searchDepartments)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/search-departments:
 *   get:
 *     summary: Search departments within a project context
 *     description: |
 *       Provides a search functionality for departments whose members are involved in the specified project.
 *       Results are filtered based on project membership and user permissions.
 *
 *       **Key Features:**
 *       - Project-specific department search
 *       - Shows departments with members assigned to project tasks
 *       - Inherits workspace access control
 *       - Includes department statistics and role information
 *       - Cursor-based pagination
 *       - Results cached with project-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 403 if user lacks project/workspace access
 *       - Returns 404 if project or workspace not found
 *       - Empty array if no departments have members in project
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the parent workspace
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to search departments within
 *         example: 456
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter departments by name
 *         example: "Design"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved project departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Design"
 *                       user_count:
 *                         type: integer
 *                         description: Number of users in this department within the project
 *                         example: 8
 *                       task_count:
 *                         type: integer
 *                         description: Number of project tasks assigned to department members
 *                         example: 25
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of roles within this department
 *                         example: ["UI Designer", "UX Researcher", "Visual Designer"]
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "project"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                         projectId:
 *                           type: integer
 *                           example: 456
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid project ID or workspace ID"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access project"
 *       404:
 *         description: Project or workspace not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project or workspace not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search project departments"
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/search-departments",
	dashboardMiddleware("project"),
	searchDepartments
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/search-departments:
 *   get:
 *     summary: Search departments related to a user profile
 *     description: |
 *       Provides a search functionality for departments associated with a user's tasks and projects.
 *       Results are filtered based on user permissions and task assignments.
 *
 *       **Key Features:**
 *       - Profile-specific department search
 *       - Shows departments involved in user's tasks
 *       - Special permission handling for viewing other profiles
 *       - Includes statistics relevant to the user's work
 *       - Cursor-based pagination
 *       - Results cached with profile-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 403 if viewer lacks permission to view profile data
 *       - Returns 404 if user profile not found
 *       - Empty array if no departments match criteria
 *       - Special handling for self vs. other profile views
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user profile to search departments for
 *         example: 789
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter departments by name
 *         example: "Marketing"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved profile-related departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Marketing"
 *                       user_count:
 *                         type: integer
 *                         description: Number of users from this department collaborating with the profile
 *                         example: 6
 *                       task_count:
 *                         type: integer
 *                         description: Number of shared tasks with department members
 *                         example: 18
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of roles within this department
 *                         example: ["Content Writer", "Social Media Manager", "SEO Specialist"]
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "profile"
 *                         profileId:
 *                           type: integer
 *                           example: 789
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid user ID or search parameters"
 *       403:
 *         description: Insufficient permissions to view profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to view this profile's data"
 *       404:
 *         description: User profile not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User profile not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search profile-related departments"
 */
router.get("/profile/:userId/search-departments", dashboardMiddleware("profile"), searchDepartments)

/**
 * @swagger
 * /api/dashboard/search-department-roles:
 *   get:
 *     summary: Search roles within a specific department
 *     description: |
 *       Provides a search functionality for roles within a selected department.
 *       Results are filtered based on user permissions and departmental access.
 *
 *       **Key Features:**
 *       - Department-specific role search
 *       - Shows roles and their usage statistics
 *       - Role-based access control for department data
 *       - Cursor-based pagination
 *       - Results cached with department-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if no department ID is provided
 *       - Returns 403 if user lacks department access
 *       - Empty array if no roles match criteria
 *       - Validates department existence before search
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the department to search roles within
 *         example: 123
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter roles by name
 *         example: "Senior Developer"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved department roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Senior Developer"
 *                       department_name:
 *                         type: string
 *                         description: Name of the parent department
 *                         example: "Engineering"
 *                       user_count:
 *                         type: integer
 *                         description: Number of users assigned this role
 *                         example: 8
 *                       task_count:
 *                         type: integer
 *                         description: Number of tasks assigned to users with this role
 *                         example: 45
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "landing"
 *                         departmentId:
 *                           type: integer
 *                           example: 123
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Department ID is required"
 *       403:
 *         description: Insufficient department access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access department roles"
 *       404:
 *         description: Department not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Department not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search department roles"
 */
router.get("/search-department-roles", dashboardMiddleware("landing"), searchDepartmentRoles)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/search-department-roles:
 *   get:
 *     summary: Search department roles within a workspace context
 *     description: |
 *       Provides a search functionality for roles within a selected department, filtered by workspace context.
 *       Results show roles of department members who are active in the workspace.
 *
 *       **Key Features:**
 *       - Workspace-aware department role search
 *       - Shows roles from departments active in workspace
 *       - Includes role usage statistics within workspace scope
 *       - Cursor-based pagination
 *       - Results cached with workspace-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if no department ID is provided
 *       - Returns 403 if user lacks workspace access
 *       - Returns 404 if workspace or department not found
 *       - Empty array if no roles match within workspace context
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the workspace context
 *         example: 123
 *       - in: query
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the department to search roles within
 *         example: 456
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter roles by name
 *         example: "Project Manager"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved workspace-scoped department roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Project Manager"
 *                       department_name:
 *                         type: string
 *                         description: Name of the parent department
 *                         example: "Operations"
 *                       user_count:
 *                         type: integer
 *                         description: Number of users with this role in workspace
 *                         example: 3
 *                       task_count:
 *                         type: integer
 *                         description: Number of workspace tasks assigned to users with this role
 *                         example: 25
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "workspace"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                         departmentId:
 *                           type: integer
 *                           example: 456
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Department ID is required"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access workspace"
 *       404:
 *         description: Workspace or department not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Workspace or department not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search workspace department roles"
 */
router.get("/workspace/:workspaceId/search-department-roles", dashboardMiddleware("workspace"), searchDepartmentRoles)

/**
 * @swagger
 * /api/dashboard/workspace/{workspaceId}/project/{projectId}/search-department-roles:
 *   get:
 *     summary: Search department roles within a project context
 *     description: |
 *       Provides a search functionality for roles within a selected department, filtered by project context.
 *       Results show roles of department members who are involved in the project.
 *
 *       **Key Features:**
 *       - Project-aware department role search
 *       - Shows roles from departments active in project
 *       - Inherits workspace access control
 *       - Includes role usage statistics within project scope
 *       - Cursor-based pagination
 *       - Results cached with project-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if no department ID is provided
 *       - Returns 403 if user lacks project access
 *       - Returns 404 if project/workspace/department not found
 *       - Empty array if no roles match within project context
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the parent workspace
 *         example: 123
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project context
 *         example: 456
 *       - in: query
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the department to search roles within
 *         example: 789
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter roles by name
 *         example: "Technical Lead"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved project-scoped department roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Technical Lead"
 *                       department_name:
 *                         type: string
 *                         description: Name of the parent department
 *                         example: "Engineering"
 *                       user_count:
 *                         type: integer
 *                         description: Number of users with this role in project
 *                         example: 2
 *                       task_count:
 *                         type: integer
 *                         description: Number of project tasks assigned to users with this role
 *                         example: 15
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "project"
 *                         workspaceId:
 *                           type: integer
 *                           example: 123
 *                         projectId:
 *                           type: integer
 *                           example: 456
 *                         departmentId:
 *                           type: integer
 *                           example: 789
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Department ID is required"
 *       403:
 *         description: Insufficient access permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to access project"
 *       404:
 *         description: Project, workspace, or department not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project, workspace, or department not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search project department roles"
 */
router.get(
	"/workspace/:workspaceId/project/:projectId/search-department-roles",
	dashboardMiddleware("project"),
	searchDepartmentRoles
)

/**
 * @swagger
 * /api/dashboard/profile/{userId}/search-department-roles:
 *   get:
 *     summary: Search department roles related to a user profile
 *     description: |
 *       Provides a search functionality for roles within a selected department, filtered by user profile context.
 *       Results show roles that interact with the specified user's tasks and projects.
 *
 *       **Key Features:**
 *       - Profile-specific department role search
 *       - Shows roles that collaborate with the user
 *       - Special permission handling for viewing other profiles
 *       - Includes collaboration statistics
 *       - Cursor-based pagination
 *       - Results cached with profile-specific TTL
 *
 *       **Edge Cases:**
 *       - Returns 400 if no department ID is provided
 *       - Returns 403 if viewer lacks permission to see profile data
 *       - Returns 404 if profile or department not found
 *       - Empty array if no roles have interactions with profile
 *       - Special handling for self vs. other profile views
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the user profile to search department roles for
 *         example: 789
 *       - in: query
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the department to search roles within
 *         example: 456
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter roles by name
 *         example: "QA Engineer"
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             id:
 *               type: integer
 *         description: Cursor for pagination (obtained from previous response)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 5
 *         description: Number of results to return per request
 *     responses:
 *       200:
 *         description: Successfully retrieved profile-related department roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "QA Engineer"
 *                       department_name:
 *                         type: string
 *                         description: Name of the parent department
 *                         example: "Quality Assurance"
 *                       user_count:
 *                         type: integer
 *                         description: Number of users with this role collaborating with profile
 *                         example: 4
 *                       task_count:
 *                         type: integer
 *                         description: Number of shared tasks with users in this role
 *                         example: 12
 *                 cursor:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *                   description: Cursor for fetching next set of results
 *                 hasMore:
 *                   type: boolean
 *                   description: Indicates if more results are available
 *                 _meta:
 *                   type: object
 *                   properties:
 *                     context:
 *                       type: object
 *                       properties:
 *                         viewType:
 *                           type: string
 *                           example: "profile"
 *                         profileId:
 *                           type: integer
 *                           example: 789
 *                         departmentId:
 *                           type: integer
 *                           example: 456
 *                     cache:
 *                       type: object
 *                       properties:
 *                         hit:
 *                           type: boolean
 *                         key:
 *                           type: string
 *                         ttl:
 *                           type: integer
 *                           description: Cache time-to-live in seconds
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Department ID is required"
 *       403:
 *         description: Insufficient permissions to view profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Insufficient permissions to view this profile's data"
 *       404:
 *         description: Profile or department not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User profile or department not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to search profile-related department roles"
 */
router.get("/profile/:userId/search-department-roles", dashboardMiddleware("profile"), searchDepartmentRoles)

module.exports = router
