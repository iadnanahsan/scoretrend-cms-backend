import {User} from "@prisma/client"
import {EmailService} from "./email.service"

// Observer Interface
interface ContentObserver {
	update(content: any): void
	getUserId?(): string
}

// Subject Interface
interface ContentSubject {
	attach(observer: ContentObserver): void
	detach(observer: ContentObserver): void
	notify(content: any): void
	getObservers(): ContentObserver[]
}

// Concrete Observer for Email Notifications
class EmailNotificationObserver implements ContentObserver {
	private emailService: EmailService
	private user: User

	constructor(user: User) {
		this.emailService = new EmailService()
		this.user = user
	}

	update(content: any): void {
		this.emailService.sendEmail({
			to: this.user.email,
			subject: "Content Update Notification",
			html: `Content has been updated: ${content.title}`,
		})
	}

	getUserId(): string {
		return this.user.id
	}
}

// Concrete Subject for Content Updates
export class ContentUpdateSubject implements ContentSubject {
	private observers: ContentObserver[] = []

	public attach(observer: ContentObserver): void {
		const isExist = this.observers.includes(observer)
		if (!isExist) {
			this.observers.push(observer)
		}
	}

	public detach(observer: ContentObserver): void {
		const observerIndex = this.observers.indexOf(observer)
		if (observerIndex !== -1) {
			this.observers.splice(observerIndex, 1)
		}
	}

	public notify(content: any): void {
		for (const observer of this.observers) {
			observer.update(content)
		}
	}

	public getObservers(): ContentObserver[] {
		return [...this.observers]
	}
}

// Content Update Manager
export class ContentUpdateManager {
	private subject: ContentUpdateSubject

	constructor() {
		this.subject = new ContentUpdateSubject()
	}

	public subscribeUser(user: User): void {
		const observer = new EmailNotificationObserver(user)
		this.subject.attach(observer)
	}

	public unsubscribeUser(user: User): void {
		const observers = this.subject.getObservers()
		const observer = observers.find((obs) => obs.getUserId?.() === user.id)
		if (observer) {
			this.subject.detach(observer)
		}
	}

	public notifyContentUpdate(content: any): void {
		this.subject.notify(content)
	}
}
