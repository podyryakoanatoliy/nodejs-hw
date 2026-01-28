import { Schema, model } from 'mongoose';

import { TAGS } from '../constants/tags.js';
import { User } from './user.js';

const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      // required: false,
      type: String,
      default: '',
      trim: true,
    },
    tag: {
      type: String,
      enum: TAGS,
      default: 'Todo',
    },
    userId:{
      type: Schema.Types.ObjectId,
      ref: User,
      required:true
    }
  },
  {
    timestamps: true,
    // versionKey: false,
  },
);

noteSchema.index({title: "text", content: "text"})

export const Note = model('Note', noteSchema);
