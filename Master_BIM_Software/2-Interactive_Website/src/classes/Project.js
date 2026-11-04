export class Project {
    constructor(data) {
        // 'this' refers to the newly created instance in memory
        this.name = data.name;
        this.description = data.description;
        this.userRole = data.userRole;
        this.status = data.status;
        this.finishDate = data.finishDate;
    }
}
