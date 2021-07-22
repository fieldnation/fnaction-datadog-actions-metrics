import { Series } from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/Series'
import { WorkflowRunEvent } from '@octokit/webhooks-definitions/schema'
import { ListJobsForWorkflowRun } from './types'

export const computeWorkflowRunMetrics = (e: WorkflowRunEvent): Series[] => {
  const updatedAt = new Date(e.workflow_run.updated_at).getTime() / 1000
  const tags = [
    `repository_owner:${e.workflow_run.repository.owner.login}`,
    `repository_name:${e.workflow_run.repository.name}`,
    `workflow_name:${e.workflow_run.name}`,
    `event:${e.workflow_run.event}`,
    `conclusion:${e.workflow_run.conclusion}`,
    `branch:${e.workflow_run.head_branch}`,
    `default_branch:${e.workflow_run.head_branch === e.repository.default_branch}`,
  ]
  return [
    {
      host: 'github.com',
      tags,
      metric: 'github.actions.workflow_run.total',
      type: 'count',
      points: [[updatedAt, 1]],
    },
    {
      host: 'github.com',
      tags,
      metric: `github.actions.workflow_run.conclusion.${e.workflow_run.conclusion}_total`,
      type: 'count',
      points: [[updatedAt, 1]],
    },
  ]
}

export const computeJobMetrics = (e: WorkflowRunEvent, listJobsForWorkflowRun: ListJobsForWorkflowRun): Series[] => {
  const series: Series[] = []
  for (const j of listJobsForWorkflowRun.jobs) {
    if (j.completed_at === null) {
      continue
    }

    const completedAt = new Date(j.completed_at).getTime() / 1000
    const tags = [
      `repository_owner:${e.workflow_run.repository.owner.login}`,
      `repository_name:${e.workflow_run.repository.name}`,
      `workflow_name:${e.workflow_run.name}`,
      `event:${e.workflow_run.event}`,
      `branch:${e.workflow_run.head_branch}`,
      `default_branch:${e.workflow_run.head_branch === e.repository.default_branch}`,
      `job_name:${j.name}`,
      `conclusion:${j.conclusion}`,
      `status:${j.status}`,
    ]
    series.push(
      {
        host: 'github.com',
        tags,
        metric: 'github.actions.job.total',
        type: 'count',
        points: [[completedAt, 1]],
      },
      {
        host: 'github.com',
        tags,
        metric: `github.actions.job.conclusion.${j.conclusion}_total`,
        type: 'count',
        points: [[completedAt, 1]],
      }
    )

    const startedAt = new Date(j.started_at).getTime() / 1000
    const duration = completedAt - startedAt
    series.push({
      host: 'github.com',
      tags,
      metric: 'github.actions.job.duration_second',
      type: 'gauge',
      points: [[completedAt, duration]],
    })
  }
  return series
}