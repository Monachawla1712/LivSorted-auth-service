import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'params', schema: 'auth' })
export class ParamsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  param_key: string;

  @Column()
  param_name: string;

  @Column()
  param_value: string;

  @Column()
  active: number;

  @Column()
  is_editable: number;

  @Column()
  is_public: number;
}
