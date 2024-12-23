import { SocietyActivityUploadBean } from './dto/society.activity.upload.bean.dto';
import { ParseResult } from '../core/common/dto/parse-result.bean';
import { ErrorBean } from '../core/common/dto/error.bean';
import { SocietyActivityEntity } from './entity/society.activity.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocietyService } from './society.service';

@Injectable()
export class SocietyActivityService {
  constructor(
    private societyService: SocietyService,
    @InjectRepository(SocietyActivityEntity)
    private readonly societyActivityRepository: Repository<SocietyActivityEntity>,
  ) {}

  async validateSocietyActivitySheetUpload(
    societyActivityUploadBeans: SocietyActivityUploadBean[],
  ) {
    const societyActivityUploadBeanParseResult =
      new ParseResult<SocietyActivityUploadBean>();
    if (societyActivityUploadBeans.length == 0) {
      societyActivityUploadBeanParseResult.failedRows =
        societyActivityUploadBeans;
      return societyActivityUploadBeanParseResult;
    }
    const existingSocieties = await this.societyService.findByIds(
        societyActivityUploadBeans.map((bean) => {
          if (bean.societyId != '') {
            return Number.parseInt(bean.societyId);
          } else if (
              !bean.societyId ||
              !existingSocietyIds.has(Number.parseInt(bean.societyId))
          ) {
            bean.errors.push(
                new ErrorBean('FIELD_ERROR', 'invalid SocietyId', 'societyId'),
            );
          } else {
            bean.errors.push(
                new ErrorBean(
                    'FIELD_ERROR',
                    'Society Id not present in sheet',
                    'societyId',
                ),
            );
          }
        }),
    );
    const existingSocietyIds = new Set<number>();
    existingSocieties?.forEach((society) => {
      existingSocietyIds.add(society.id);
    });
    for (const uploadBean of societyActivityUploadBeans) {
      if (
        !uploadBean.societyId ||
        !existingSocietyIds.has(Number.parseInt(uploadBean.societyId))
      ) {
        uploadBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'invalid SocietyId', 'societyId'),
        );
      }
      if (uploadBean.spend == null || uploadBean.spend.length < 0) {
        uploadBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'spend not found', 'spend'),
        );
      }
      if (uploadBean.circulation == null || uploadBean.circulation.length < 0) {
        uploadBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'circulation not found', 'circulation'),
        );
      }
      if (
        uploadBean.typeOfActivity == null ||
        uploadBean.typeOfActivity.length < 0
      ) {
        uploadBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'typeOfActivity not found',
            'typeOfActivity',
          ),
        );
      }
      if (
        uploadBean.dateOfExecution == null ||
        uploadBean.dateOfExecution.length < 0
      ) {
        uploadBean.errors.push(
          new ErrorBean(
            'FIELD_ERROR',
            'dateOfExecution not found',
            'dateOfExecution',
          ),
        );
      }
      if (uploadBean.dateOfExecution != null) {
        const [day, month, year] = uploadBean.dateOfExecution.split('/');
        if (
          day == null ||
          month == null ||
          year == null ||
          day.length == 0 ||
          month.length == 0 ||
          year.length == 0
        ) {
          uploadBean.errors.push(
            new ErrorBean(
              'FIELD_ERROR',
              'Invalid date format, change the format to dd/mm/yyyy',
              'dateOfExecution',
            ),
          );
        }
      }
      if (uploadBean.couponCode == null || uploadBean.couponCode.length < 0) {
        uploadBean.errors.push(
          new ErrorBean('FIELD_ERROR', 'couponCode not found', 'couponCode'),
        );
      }
      if (uploadBean.errors.length == 0) {
        societyActivityUploadBeanParseResult.successRows.push(uploadBean);
      } else {
        societyActivityUploadBeanParseResult.failedRows.push(uploadBean);
      }
    }
    return societyActivityUploadBeanParseResult;
  }

  async bulkUploadSocietyActivity(
    societyActivityUploadBeans: SocietyActivityUploadBean[],
    userId: string,
  ) {
    const societyActivityEntities = [];
    for (const societyActivityUploadBean of societyActivityUploadBeans) {
      const societyActivity = SocietyActivityEntity.createSocietyActivityEntity(
        Number.parseInt(societyActivityUploadBean.societyId),
        Number.parseInt(societyActivityUploadBean.circulation),
        societyActivityUploadBean.couponCode,
        societyActivityUploadBean.dateOfExecution,
        Number.parseFloat(societyActivityUploadBean.spend),
        societyActivityUploadBean.typeOfActivity,
        userId,
      );
      societyActivityEntities.push(societyActivity);
    }
    await this.societyActivityRepository.save(societyActivityEntities);
  }
}
