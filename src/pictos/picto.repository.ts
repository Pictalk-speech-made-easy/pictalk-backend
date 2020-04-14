import { EntityRepository, Repository } from 'typeorm';
import { Picto } from './picto.entity';
import { Logger, InternalServerErrorException } from '@nestjs/common';
import { CreatePictoDto } from './dto/create-picto.dto';
import { User } from 'src/auth/user.entity';
@EntityRepository(Picto)
export class PictoRepository extends Repository<Picto> {
  private logger = new Logger('PictoRepository');

  async createPicto(
    createPictoDto: CreatePictoDto,
    user: User,
    filename: string,
  ) {
    const { speech, meaning, folder, fatherId } = createPictoDto;

    const picto = new Picto();

    picto.speech = speech;
    picto.meaning = meaning;
    picto.folder = folder;
    picto.fatherId = fatherId;
    picto.path = filename;
    picto.user = user;

    try {
      await picto.save();
    } catch (error) {
      this.logger.error(
        `Failed to create a picto for user "${
          user.username
        }". Data: ${JSON.stringify(createPictoDto)}`,
        error.stack,
      );
      throw new InternalServerErrorException();
    }
    delete picto.user;
    return picto;
  }
}
