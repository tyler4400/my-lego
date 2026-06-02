import { IsBoolean } from 'class-validator'
import { WorkIdDto } from '@/module/work/dto/work-id.dto'

/**
 * 切换作品公开性的 DTO
 * - id：作品 id（来自 WorkIdDto）
 * - isPublic：目标公开状态
 * 业务约束（service 层校验）：
 * - 仅 status=Published 的作品才允许调用本接口（无论 isPublic 设 true 还是 false）
 */
export class SetPublicDto extends WorkIdDto {
  @IsBoolean({ message: 'isPublic 必须是 boolean' })
  isPublic!: boolean
}
