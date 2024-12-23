import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SocietyEntity } from './entity/society.entity';
import { SocietyDto } from './dto/society.dto';
import { SocietyRequest } from './dto/society.request';
import { SocietyUpdatePayload } from './dto/society.update.payload';
import { ParseResult } from '../core/common/dto/parse-result.bean';
import { ErrorBean } from '../core/common/dto/error.bean';
import { SocietyActivityUploadBean } from './dto/society.activity.upload.bean.dto';
import { SocietyActivityEntity } from './entity/society.activity.entity';

@Injectable()
export class SocietyService {
  constructor(
    @InjectRepository(SocietyEntity)
    private readonly societyRepository: Repository<SocietyEntity>,
    @InjectRepository(SocietyActivityEntity)
    private readonly societyActivityRepository: Repository<SocietyActivityEntity>,
  ) {}

  convertToPolyGeoJson(areaPolygonString: string) {
    const coordinatesString = areaPolygonString.slice(10, -2);
    const coordinates = coordinatesString.split(', ').map((pointStr) => {
      return pointStr.split(' ').map((coordinate) => parseFloat(coordinate));
    });
    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  }

  async createSociety(req: SocietyRequest, updatedBy: string) {
    let societyDto = new SocietyDto();
    this.convertReqToDto(societyDto, req);
    let areaPolygonGeoJson = null;
    if (societyDto.isContactDelivery && societyDto.areaPolygon) {
      areaPolygonGeoJson = this.convertToPolyGeoJson(societyDto.areaPolygon);
    }
    let society = new SocietyEntity();
    Object.assign(society, societyDto);
    society.areaPolygon = areaPolygonGeoJson;
    society.updated_by = updatedBy;
    return await this.societyRepository.save(society);
  }

  async updateSociety(id: string, req: SocietyRequest, updatedBy: string) {
    let existingSociety = await this.societyRepository.findOneBy({
      id: Number.parseInt(id),
    });
    this.updateSingleSociety(existingSociety, req, updatedBy);
  }

  async updateSocietyInBulk(req: SocietyUpdatePayload, updatedBy: string) {
    const ids = Object.keys(req).map((key) => parseInt(key, 10));
    const societyList: SocietyEntity[] = await this.findByIds(ids);
    for (const existing of societyList) {
      const updatedSociety = req[existing.id];
      await this.updateSingleSociety(existing, updatedSociety, updatedBy);
    }
  }

  private async updateSingleSociety(
    existingSociety: SocietyEntity,
    req: SocietyRequest,
    updatedBy: string,
  ) {
    if (!existingSociety) {
      throw new NotFoundException('Society not found');
    }

    let societyDto = new SocietyDto();
    this.convertReqToDto(societyDto, req);

    let areaPolygonGeoJson = existingSociety.areaPolygon;
    if (societyDto.isContactDelivery && societyDto.areaPolygon) {
      areaPolygonGeoJson = this.convertToPolyGeoJson(societyDto.areaPolygon);
    }

    Object.assign(existingSociety, societyDto);
    existingSociety.areaPolygon = areaPolygonGeoJson;
    existingSociety.updated_by = updatedBy;

    return await this.societyRepository.save(existingSociety);
  }

  async findByIds(ids: number[]): Promise<SocietyEntity[]> {
    return await this.societyRepository.find({
      where: { id: In(ids) },
    });
  }

  async toggleActive(id: number, toggle: number, updatedBy: string) {
    let society = await this.societyRepository.findOneBy({
      id: id,
    });
    if (society == null) {
      throw new NotFoundException(society, 'society not found');
    }
    society.isActive = toggle == 1;
    society.updated_by = updatedBy;
    return await this.societyRepository.save(society);
  }

  private convertReqToDto(societyDto: SocietyDto, req: SocietyRequest) {
    societyDto.id = req.id;
    societyDto.name = req.name;
    societyDto.latitude = req.latitude;
    societyDto.longitude = req.longitude;
    societyDto.tower = req.tower;
    societyDto.storeId = Number.parseInt(req.storeId);
    societyDto.pincode = req.pincode;
    societyDto.city = req.city;
    societyDto.state = req.state;
    societyDto.isContactDelivery = req.isContactDelivery == 1;
    societyDto.areaPolygon = req.areaPolygon;
    societyDto.metadata = req.metadata;
    societyDto.isActive = req.active == 1;
  }

  async getBySocietyIds(societyIds: number[]) {
    return await this.societyRepository.find({
      where: {id: In(societyIds), isActive: true},
    });
  }

}
