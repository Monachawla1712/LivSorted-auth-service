export class DuplicateUserDto {
  creationTime: Date;
  userId: string;
  orderCount: number;

  static fromJson(json: any): DuplicateUserDto {
    const dto = new DuplicateUserDto();
    dto.creationTime = new Date(json.creationtime);
    dto.userId = json.userid;
    dto.orderCount = json.ordercount;
    return dto;
  }
}
