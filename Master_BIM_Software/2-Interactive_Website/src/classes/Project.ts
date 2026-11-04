export class Project {
    name: string;
    description: string;
    userRole: string;
    status: string;
    finishDate: string;

    constructor(data: any) {
        // 'this' refers to the newly created instance in memory
        this.name = data.name;
        this.description = data.description;
        this.userRole = data.userRole;
        this.status = data.status;
        this.finishDate = data.finishDate;
    }
}
