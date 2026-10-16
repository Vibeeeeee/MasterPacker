// Attribute types
export type AttributeType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT';

// Tag types
export interface TagWithClass {
  id: string;
  name: string;
  color: string;
  tagClassId: string | null;
  tagClass: { id: string; name: string; color: string } | null;
}

// Item types
export interface ItemWithRelations {
  id: string;
  name: string;
  description: string | null;
  markForReorder: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: { tag: TagWithClass }[];
  attributes: {
    attribute: {
      id: string;
      name: string;
      type: string;
      options: string | null;
    };
    value: string | null;
  }[];
  pictures: {
    id: string;
    data: Buffer;
    mimeType: string;
    filename: string | null;
  }[];
  boxItems: {
    boxId: string;
    box: { id: string; name: string; };
    quantity: number;
  }[];
}

// Box types
export interface BoxWithRelations {
  id: string;
  name: string;
  description: string | null;
  parentBoxId: string | null;
  parentBox: { id: string; name: string; } | null;
  childBoxes: { id: string; name: string; }[];
  createdAt: Date;
  updatedAt: Date;
  tags: { tag: TagWithClass }[];
  pictures: {
    id: string;
    data: Buffer;
    mimeType: string;
    filename: string | null;
  }[];
  boxItems: {
    id: string;
    itemId: string;
    item: {
      id: string;
      name: string;
      description: string | null;
      markForReorder: boolean;
    };
    quantity: number;
  }[];
}

// User types
export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
