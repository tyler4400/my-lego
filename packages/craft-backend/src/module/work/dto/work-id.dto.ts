import { IsInt, Min } from 'class-validator'

export class WorkIdDto {
  @IsInt({ message: 'id 必须是整数' })
  @Min(1, { message: 'id 必须大于等于 1' })
  id!: number
}
