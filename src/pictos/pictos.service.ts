import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PictoRepository } from './picto.repository';
import { User } from 'src/auth/user.entity';
import { Picto } from './picto.entity';
import { CreatePictoDto } from './dto/create-picto.dto';
import { Collection } from './collection.entity';
import { unlink } from 'fs';
import { EditPictoDto } from './dto/edit-picto.dto';
import { MinioService } from 'nestjs-minio-client';

@Injectable()
export class PictoService {
  constructor(
    @InjectRepository(PictoRepository)
    private pictoRepository: PictoRepository,
    private readonly minioClient: MinioService,
  ) {}
  private logger = new Logger('PictoController');

  async getPictos(
    id: number,
    user: User,
    collection: Collection,
  ): Promise<Picto[]> {
    const pictos = await this.pictoRepository.find({
      where: { fatherId: id, userId: user.id, collection: collection },
    });
    await pictos.map(picto => {
      delete picto.userId;
      delete picto.id;
    });
    return pictos;
  }

  async createPicto(
    createPictoDto: CreatePictoDto,
    user: User,
    filename: string,
    collection: Collection,
  ): Promise<Picto> {
    const exists = await this.minioClient.client.bucketExists('pictalk');
    if (exists) {
      this.logger.log(`Bucket exists !`);
    }
    return this.pictoRepository.createPicto(
      createPictoDto,
      user,
      filename,
      collection,
    );
  }

  async deletePicto(id: number, user: User): Promise<void> {
    const picto: Picto = await this.pictoRepository.findOne({
      where: { id: id, userId: user.id },
    });
    if (picto) {
      await this.deletePictoRecursive(picto, user);
    } else {
      throw new NotFoundException();
    }
  }

  async deletePictoRecursive(picto: Picto, user: User): Promise<any[]> {
    unlink('./tmp/' + picto.path, () => {
      this.logger.verbose(`Picto of path "${picto.path}" successfully deleted`);
    });
    const pictos: Picto[] = await this.pictoRepository.find({
      where: { fatherId: picto.id, userId: user.id },
    });

    const result = await this.pictoRepository.delete({
      id: picto.id,
      userId: user.id,
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Picto with id "${picto.id}" not found`);
    }
    if (pictos.length == 0) {
      return;
    } else {
      return pictos.map(picto => this.deletePictoRecursive(picto, user));
    }
  }

  async deletePictoOfCollection(
    collection: Collection,
    user: User,
  ): Promise<void> {
    const pictos: Picto[] = await this.pictoRepository.find({
      where: { collection: collection, userId: user.id },
    });
    this.deleteMultiple(pictos);
    try {
      await this.pictoRepository.delete({
        userId: user.id,
        collection: collection,
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
  async editPicto(
    id: number,
    editPictoDto: EditPictoDto,
    user: User,
    filename?: string,
  ): Promise<Picto> {
    if (filename) {
      return this.pictoRepository.editPicto(id, editPictoDto, user, filename);
    } else {
      return this.pictoRepository.editPicto(id, editPictoDto, user);
    }
  }

  async isFolder(id: number, user: User): Promise<number> {
    const found = await this.pictoRepository.findOne({
      where: { id, userId: user.id },
    });
    if (!found) {
      return 0;
    }
    return found.folder;
  }

  async getCollection(id: number, user: User): Promise<Collection> {
    const picto: Picto = await this.pictoRepository.findOne({
      where: { id, userId: user.id },
    });
    try {
      const collection: Collection = picto.collection;
      return collection;
    } catch (error) {
      throw new NotFoundException();
    }
  }

  async deleteMultiple(pictos: Picto[]) {
    pictos.forEach(picto => {
      unlink('./tmp/' + picto.path, () => {
        this.logger.verbose(
          `Picto of path "${picto.path}" successfully deleted`,
        );
      });
    });
  }
}
