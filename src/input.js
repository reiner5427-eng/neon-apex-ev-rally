export class TouchInput {
  constructor(){this.pointers=new Map();}
  down(id,key){this.pointers.set(id,key);}
  up(id){this.pointers.delete(id);}
  clear(){this.pointers.clear();}
  keys(){return Object.fromEntries([...this.pointers.values()].map(key=>[key,true]));}
}
