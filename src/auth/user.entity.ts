import {
  BaseEntity,
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Collection } from 'src/pictos/collection.entity';
import { Picto } from 'src/pictos/picto.entity';

@Entity()
@Unique(['username'])
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column()
  salt: string;

  @OneToMany(
    type => Collection,
    collection => collection.user,
    { eager: true },
  )
  collections: Collection[];

  @OneToMany(
    type => Picto,
    picto => picto.user,
    { eager: true },
  )
  pictos: Picto[];

  async validatePassword(password: string): Promise<boolean> {
    const hash = await bcrypt.hash(password, this.salt);
    return hash === this.password;
  }
}
