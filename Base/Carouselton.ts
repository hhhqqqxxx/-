import { _decorator, Component } from 'cc';

export class Carouselton extends Component {
    public currentIndex: number = 0
    protected carousel(way: number) {
        this.currentIndex += way
        if (this.currentIndex < 0)
            this.currentIndex = 0
        let maxIndex = this.node.children.length - 1
        if (this.currentIndex > maxIndex)
            this.currentIndex = maxIndex
    }
}


